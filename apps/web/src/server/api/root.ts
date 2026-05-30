import "server-only";

import { createTRPCRouter } from "@/server/api/trpc";
import { agentRouter } from "./routers/agent";
import { analysisRouter } from "./routers/analysis";
import { autopilotRouter } from "./routers/autopilot";
import { internalRouter } from "./routers/internal";
import { promptRouter } from "./routers/prompt";
import { workspaceRouter } from "./routers/workspace";

export const appRouter = createTRPCRouter({
	workspace: workspaceRouter,
	prompt: promptRouter,
	analysis: analysisRouter,
	agent: agentRouter,
	autopilot: autopilotRouter,
	internal: internalRouter,
});

export type AppRouter = typeof appRouter;
