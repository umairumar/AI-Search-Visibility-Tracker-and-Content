import type { ContentGenerationJobPayload } from "@oneglanse/types";
import { runContentGenerationPipeline } from "./pipeline.js";

export async function handleContentGenerationJob(
	payload: ContentGenerationJobPayload,
): Promise<void> {
	await runContentGenerationPipeline(payload);
}
