import type { ContentGenerationProgress } from "@oneglanse/types";
import { redis } from "../agent/redis.js";

const CONTENT_PROGRESS_TTL_SECONDS = 24 * 60 * 60;

function buildProgressKey(jobId: string): string {
	return `autopilot:job:${jobId}:progress`;
}

export async function updateContentGenerationProgress(args: {
	jobId: string;
	articleId: string;
	status: ContentGenerationProgress["status"];
	error?: string;
}): Promise<void> {
	const progress: ContentGenerationProgress = {
		status: args.status,
		articleId: args.articleId,
		error: args.error,
		updatedAt: new Date().toISOString(),
	};

	await redis.set(
		buildProgressKey(args.jobId),
		JSON.stringify(progress),
		"EX",
		CONTENT_PROGRESS_TTL_SECONDS,
	);
}

export async function getContentGenerationProgress(
	jobId: string,
): Promise<ContentGenerationProgress | null> {
	const raw = await redis.get(buildProgressKey(jobId));
	if (!raw) return null;
	return JSON.parse(raw) as ContentGenerationProgress;
}

export async function seedContentGenerationProgress(args: {
	jobId: string;
	articleId: string;
}): Promise<void> {
	await updateContentGenerationProgress({
		jobId: args.jobId,
		articleId: args.articleId,
		status: "queued",
	});
}
