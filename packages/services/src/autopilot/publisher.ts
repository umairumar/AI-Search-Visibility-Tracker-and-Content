import { ExternalServiceError, NotFoundError, ValidationError } from "@oneglanse/errors";
import type { GeneratedArticle } from "@oneglanse/db";
import { db, schema } from "@oneglanse/db";
import { eq } from "drizzle-orm";
import { getActiveIntegration } from "./integrations.js";

export type PublishArticleResult = {
	articleId: string;
	platformType: string;
	externalUrl?: string;
};

function normalizeCmsUrl(cmsUrl: string): string {
	return cmsUrl.replace(/\/$/, "");
}

function buildBasicAuthHeader(authToken: string): string {
	const encoded = Buffer.from(authToken, "utf8").toString("base64");
	return `Basic ${encoded}`;
}

async function uploadWordPressFeaturedImage(args: {
	cmsUrl: string;
	authHeader: string;
	imageUrl: string;
	title: string;
}): Promise<number | null> {
	try {
		const imageResponse = await fetch(args.imageUrl);
		if (!imageResponse.ok) {
			return null;
		}

		const contentType =
			imageResponse.headers.get("content-type") ?? "image/jpeg";
		const buffer = Buffer.from(await imageResponse.arrayBuffer());
		const extension = contentType.includes("png") ? "png" : "jpg";

		const response = await fetch(`${args.cmsUrl}/wp-json/wp/v2/media`, {
			method: "POST",
			headers: {
				Authorization: args.authHeader,
				"Content-Disposition": `attachment; filename="featured-${Date.now()}.${extension}"`,
				"Content-Type": contentType,
			},
			body: buffer,
		});

		if (!response.ok) {
			const body = await response.text();
			console.warn(
				`[publisher] WordPress media upload failed (${response.status}): ${body.slice(0, 200)}`,
			);
			return null;
		}

		const payload = (await response.json()) as { id?: number };
		return payload.id ?? null;
	} catch (err) {
		console.warn("[publisher] WordPress media upload error:", err);
		return null;
	}
}

async function publishToWordPress(args: {
	cmsUrl: string;
	authToken: string;
	article: GeneratedArticle;
}): Promise<{ externalUrl?: string }> {
	const cmsUrl = normalizeCmsUrl(args.cmsUrl);
	const authHeader = buildBasicAuthHeader(args.authToken);

	if (!args.article.htmlBody?.trim()) {
		throw new ValidationError(
			"Article has no HTML content. Wait for generation to complete before publishing.",
		);
	}

	let featuredMediaId: number | null = null;
	if (args.article.featuredImageUrl) {
		featuredMediaId = await uploadWordPressFeaturedImage({
			cmsUrl,
			authHeader,
			imageUrl: args.article.featuredImageUrl,
			title: args.article.title,
		});
	}

	const postBody: Record<string, unknown> = {
		title: args.article.title,
		content: args.article.htmlBody,
		status: "publish",
	};
	if (featuredMediaId) {
		postBody.featured_media = featuredMediaId;
	}

	const response = await fetch(`${cmsUrl}/wp-json/wp/v2/posts`, {
		method: "POST",
		headers: {
			Authorization: authHeader,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(postBody),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new ExternalServiceError(
			"WordPress",
			`Failed to publish post (${response.status}).`,
			response.status,
			{ responseBody: body.slice(0, 300) },
		);
	}

	const payload = (await response.json()) as { link?: string };
	return { externalUrl: payload.link };
}

async function publishToCustomWebhook(args: {
	cmsUrl: string;
	authToken: string;
	article: GeneratedArticle;
}): Promise<{ externalUrl?: string }> {
	const response = await fetch(args.cmsUrl, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${args.authToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			title: args.article.title,
			markdown: args.article.markdownBody,
			html: args.article.htmlBody,
			featuredImageUrl: args.article.featuredImageUrl,
			status: "published",
		}),
	});

	if (!response.ok) {
		const body = await response.text();
		throw new ExternalServiceError(
			"Custom Webhook",
			`Webhook publish failed (${response.status}).`,
			response.status,
			{ responseBody: body.slice(0, 300) },
		);
	}

	let externalUrl: string | undefined;
	try {
		const payload = (await response.json()) as { url?: string; link?: string };
		externalUrl = payload.url ?? payload.link;
	} catch {
		externalUrl = undefined;
	}

	return { externalUrl };
}

async function publishToShopify(): Promise<{ externalUrl?: string }> {
	throw new ValidationError(
		"Shopify publishing is not yet implemented. Use WordPress or a custom webhook.",
	);
}

export async function getArticleById(args: {
	articleId: string;
	workspaceId: string;
}): Promise<GeneratedArticle> {
	const [article] = await db
		.select()
		.from(schema.generatedArticles)
		.where(eq(schema.generatedArticles.id, args.articleId))
		.limit(1);

	if (!article || article.workspaceId !== args.workspaceId) {
		throw new NotFoundError("Generated article not found.");
	}

	return article;
}

export async function publishArticle(args: {
	articleId: string;
	workspaceId: string;
}): Promise<PublishArticleResult> {
	const integration = await getActiveIntegration({ workspaceId: args.workspaceId });
	if (!integration) {
		throw new ValidationError(
			"No active CMS integration configured. Add one in the Autopilot hub.",
		);
	}

	const article = await getArticleById(args);
	if (article.status === "published") {
		throw new ValidationError("Article is already published.");
	}
	if (article.status === "queued") {
		throw new ValidationError(
			"Article is still generating. Wait for generation to finish before publishing.",
		);
	}

	let publishResult: { externalUrl?: string };
	switch (integration.platformType) {
		case "wordpress":
			publishResult = await publishToWordPress({
				cmsUrl: integration.cmsUrl,
				authToken: integration.authToken,
				article,
			});
			break;
		case "shopify":
			publishResult = await publishToShopify();
			break;
		case "custom_webhook":
			publishResult = await publishToCustomWebhook({
				cmsUrl: integration.cmsUrl,
				authToken: integration.authToken,
				article,
			});
			break;
		default:
			throw new ValidationError(
				`Unsupported platform type: ${integration.platformType}`,
			);
	}

	const publishedAt = new Date();
	await db
		.update(schema.generatedArticles)
		.set({
			status: "published",
			publishedAt,
			updatedAt: publishedAt,
		})
		.where(eq(schema.generatedArticles.id, args.articleId));

	return {
		articleId: args.articleId,
		platformType: integration.platformType,
		externalUrl: publishResult.externalUrl,
	};
}
