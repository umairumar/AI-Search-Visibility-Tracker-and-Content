import "server-only";

import { createTRPCRouter } from "@/server/api/trpc";
import {
	getContentGenerationProgress,
	listGeneratedArticles,
	submitContentGenerationJob,
} from "@oneglanse/services";
import { z } from "zod";
import { createRateLimiter } from "../../middleware/rateLimit";
import { authorizedWorkspaceProcedure } from "../../procedures";

export const autopilotRouter = createTRPCRouter({
	generateArticle: authorizedWorkspaceProcedure
		.input(z.object({ keywordId: z.string().min(1) }))
		.use(
			createRateLimiter("autopilot.generateArticle", {
				limit: 5,
				windowSecs: 60,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return submitContentGenerationJob({
				workspaceId: ctx.workspaceId,
				userId: ctx.session.user.id,
				keywordId: input.keywordId,
			});
		}),

	getGenerationProgress: authorizedWorkspaceProcedure
		.input(z.object({ jobId: z.string().min(1) }))
		.query(async ({ input }) => {
			return getContentGenerationProgress(input.jobId);
		}),

	listArticles: authorizedWorkspaceProcedure.query(async ({ ctx }) => {
		return listGeneratedArticles({ workspaceId: ctx.workspaceId });
	}),
});
