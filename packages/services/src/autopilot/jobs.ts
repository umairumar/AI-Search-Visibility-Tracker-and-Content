import { randomUUID } from "node:crypto";
import { toErrorMessage } from "@oneglanse/errors";
import type {
	ContentGenerationJobPayload,
	SubmitContentGenerationArgs,
	SubmitContentGenerationResult,
} from "@oneglanse/types";
import { waitForRedis } from "../agent/redis.js";
import {
	createQueuedArticle,
	findActiveArticleForKeyword,
} from "./articles.js";
import { collectGenerationContext } from "./context.js";
import { getContentQueue } from "./queue.js";
import { seedContentGenerationProgress } from "./progress.js";

export async function submitContentGenerationJob(
	args: SubmitContentGenerationArgs,
): Promise<SubmitContentGenerationResult> {
	const { workspaceId, userId, keywordId } = args;

	try {
		await collectGenerationContext({ workspaceId, keywordId });
	} catch {
		return { status: "keyword_not_found" };
	}

	const existing = await findActiveArticleForKeyword({ workspaceId, keywordId });
	if (existing?.status === "queued") {
		return { status: "already_queued", articleId: existing.id };
	}

	const article = existing ?? (await createQueuedArticle({ workspaceId, keywordId }));
	const jobId = randomUUID();

	const payload: ContentGenerationJobPayload = {
		jobId,
		articleId: article.id,
		workspaceId,
		userId,
		keywordId,
	};

	await waitForRedis();
	await seedContentGenerationProgress({ jobId, articleId: article.id });

	const queue = getContentQueue();
	await queue.waitUntilReady();
	await queue.add("generate-content", payload, { jobId });

	return { status: "queued", jobId, articleId: article.id };
}

export async function enqueueContentGenerationJob(
	payload: ContentGenerationJobPayload,
): Promise<void> {
	try {
		const queue = getContentQueue();
		await queue.waitUntilReady();
		await queue.add("generate-content", payload, { jobId: payload.jobId });
	} catch (err) {
		throw new Error(
			`failed to enqueue content generation job: ${toErrorMessage(err)}`,
		);
	}
}
