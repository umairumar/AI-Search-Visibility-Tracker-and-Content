import "server-only";

import { createTRPCRouter } from "@/server/api/trpc";
import {
	deleteIntegration,
	getContentGenerationProgress,
	listGeneratedArticles,
	listIntegrations,
	publishArticle,
	saveIntegration,
	submitContentGenerationJob,
} from "@oneglanse/services";
import { z } from "zod";
import { createRateLimiter } from "../../middleware/rateLimit";
import { authorizedWorkspaceProcedure } from "../../procedures";

const platformTypeSchema = z.enum(["wordpress", "shopify", "custom_webhook"]);

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

	listIntegrations: authorizedWorkspaceProcedure.query(async ({ ctx }) => {
		return listIntegrations({ workspaceId: ctx.workspaceId });
	}),

	saveIntegration: authorizedWorkspaceProcedure
		.input(
			z.object({
				platformType: platformTypeSchema,
				cmsUrl: z.string().url().max(512),
				authToken: z.string().min(1).max(512),
			}),
		)
		.use(
			createRateLimiter("autopilot.saveIntegration", {
				limit: 10,
				windowSecs: 60,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return saveIntegration({
				workspaceId: ctx.workspaceId,
				platformType: input.platformType,
				cmsUrl: input.cmsUrl,
				authToken: input.authToken,
			});
		}),

	deleteIntegration: authorizedWorkspaceProcedure
		.input(z.object({ integrationId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			await deleteIntegration({
				workspaceId: ctx.workspaceId,
				integrationId: input.integrationId,
			});
			return { success: true };
		}),

	publishArticle: authorizedWorkspaceProcedure
		.input(z.object({ articleId: z.string().min(1) }))
		.use(
			createRateLimiter("autopilot.publishArticle", {
				limit: 10,
				windowSecs: 60,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return publishArticle({
				articleId: input.articleId,
				workspaceId: ctx.workspaceId,
			});
		}),
});
