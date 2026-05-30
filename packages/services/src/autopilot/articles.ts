import { db, schema } from "@oneglanse/db";
import type { GeneratedArticle } from "@oneglanse/db";
import type { ArticleStatus, GeneratedArticleSummary } from "@oneglanse/types";
import { newId } from "@oneglanse/utils";
import { and, desc, eq } from "drizzle-orm";
import { fetchUserPromptsForWorkspace } from "../prompt/index.js";

export async function createQueuedArticle(args: {
	workspaceId: string;
	keywordId: string;
	title?: string;
}): Promise<GeneratedArticle> {
	const id = newId("article");
	const title = args.title ?? "Generating…";

	const [article] = await db
		.insert(schema.generatedArticles)
		.values({
			id,
			workspaceId: args.workspaceId,
			keywordId: args.keywordId,
			title,
			status: "queued",
		})
		.returning();

	if (!article) {
		throw new Error("Failed to create generated article record.");
	}

	return article;
}

export async function findActiveArticleForKeyword(args: {
	workspaceId: string;
	keywordId: string;
}): Promise<GeneratedArticle | null> {
	const [existing] = await db
		.select()
		.from(schema.generatedArticles)
		.where(
			and(
				eq(schema.generatedArticles.workspaceId, args.workspaceId),
				eq(schema.generatedArticles.keywordId, args.keywordId),
			),
		)
		.orderBy(desc(schema.generatedArticles.createdAt))
		.limit(1);

	if (!existing) return null;
	if (existing.status === "queued" || existing.status === "draft") {
		return existing;
	}
	return null;
}

export async function updateArticle(args: {
	articleId: string;
	title?: string;
	markdownBody?: string;
	htmlBody?: string;
	featuredImageUrl?: string;
	status?: ArticleStatus;
}): Promise<void> {
	await db
		.update(schema.generatedArticles)
		.set({
			...(args.title !== undefined ? { title: args.title } : {}),
			...(args.markdownBody !== undefined
				? { markdownBody: args.markdownBody }
				: {}),
			...(args.htmlBody !== undefined ? { htmlBody: args.htmlBody } : {}),
			...(args.featuredImageUrl !== undefined
				? { featuredImageUrl: args.featuredImageUrl }
				: {}),
			...(args.status !== undefined ? { status: args.status } : {}),
			updatedAt: new Date(),
		})
		.where(eq(schema.generatedArticles.id, args.articleId));
}

export async function listGeneratedArticles(args: {
	workspaceId: string;
}): Promise<GeneratedArticleSummary[]> {
	const [articles, prompts] = await Promise.all([
		db
			.select()
			.from(schema.generatedArticles)
			.where(eq(schema.generatedArticles.workspaceId, args.workspaceId))
			.orderBy(desc(schema.generatedArticles.createdAt)),
		fetchUserPromptsForWorkspace({ workspaceId: args.workspaceId }),
	]);

	const promptById = new Map(prompts.map((p) => [p.id, p.prompt]));

	return articles.map((article) => ({
		id: article.id,
		workspaceId: article.workspaceId,
		keywordId: article.keywordId,
		keywordPhrase: promptById.get(article.keywordId) ?? null,
		title: article.title,
		status: article.status,
		featuredImageUrl: article.featuredImageUrl,
		publishedAt: article.publishedAt?.toISOString() ?? null,
		createdAt: article.createdAt.toISOString(),
	}));
}
