import { toErrorMessage } from "@oneglanse/errors";
import type { ContentGenerationJobPayload } from "@oneglanse/types";
import { formatMarkdown } from "@oneglanse/utils";
import { collectGenerationContext } from "./context.js";
import { generateFeaturedImage } from "./image.js";
import { extractTitleFromMarkdown, generateContentText } from "./llm.js";
import { buildDraftPrompt, buildImagePrompt, buildOutlinePrompt } from "./prompts.js";
import { updateArticle } from "./articles.js";
import { updateContentGenerationProgress } from "./progress.js";

export async function runContentGenerationPipeline(
	payload: ContentGenerationJobPayload,
): Promise<void> {
	const { articleId, workspaceId, keywordId } = payload;

	try {
		await updateContentGenerationProgress({
			jobId: payload.jobId,
			articleId,
			status: "collecting_context",
		});

		const context = await collectGenerationContext({ workspaceId, keywordId });

		await updateContentGenerationProgress({
			jobId: payload.jobId,
			articleId,
			status: "generating_outline",
		});

		const outline = await generateContentText(buildOutlinePrompt(context));

		await updateContentGenerationProgress({
			jobId: payload.jobId,
			articleId,
			status: "generating_draft",
		});

		const markdownBody = await generateContentText(
			buildDraftPrompt(context, outline),
		);
		const title = extractTitleFromMarkdown(markdownBody);
		const htmlBody = formatMarkdown(markdownBody);

		await updateArticle({
			articleId,
			title,
			markdownBody,
			htmlBody,
			status: "draft",
		});

		await updateContentGenerationProgress({
			jobId: payload.jobId,
			articleId,
			status: "generating_image",
		});

		let featuredImageUrl: string | undefined;
		try {
			featuredImageUrl = await generateFeaturedImage(
				buildImagePrompt(context, title),
			);
			await updateArticle({ articleId, featuredImageUrl });
		} catch (imageErr) {
			console.warn(
				`[autopilot] featured image generation failed for article ${articleId}: ${toErrorMessage(imageErr)}`,
			);
		}

		await updateContentGenerationProgress({
			jobId: payload.jobId,
			articleId,
			status: "completed",
		});
	} catch (err) {
		await updateContentGenerationProgress({
			jobId: payload.jobId,
			articleId,
			status: "failed",
			error: toErrorMessage(err),
		});
		await updateArticle({ articleId, status: "draft" }).catch(() => {});
		throw err;
	}
}
