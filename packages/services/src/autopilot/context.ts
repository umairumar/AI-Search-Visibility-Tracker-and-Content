import { NotFoundError } from "@oneglanse/errors";
import type { ContentGenerationContext } from "@oneglanse/types";
import { fetchUserPromptsForWorkspace } from "../prompt/index.js";
import { getWorkspaceById } from "../workspace/index.js";

export async function collectGenerationContext(args: {
	workspaceId: string;
	keywordId: string;
}): Promise<ContentGenerationContext> {
	const { workspaceId, keywordId } = args;

	const [workspace, prompts] = await Promise.all([
		getWorkspaceById({ workspaceId }),
		fetchUserPromptsForWorkspace({ workspaceId }),
	]);

	const prompt = prompts.find((p) => p.id === keywordId);
	if (!prompt) {
		throw new NotFoundError(
			`Keyword prompt ${keywordId} not found in workspace ${workspaceId}.`,
		);
	}

	return {
		workspaceId,
		keywordId,
		brandName: workspace.name,
		brandDomain: workspace.domain,
		keywordPhrase: prompt.prompt,
	};
}
