import { ExternalServiceError } from "@oneglanse/errors";
import { env } from "../env.js";
import { chatgpt, claude } from "../llm/index.js";

const CONTENT_SYSTEM_PROMPT =
	"You are an expert GEO (Generative Engine Optimization) content writer. " +
	"Follow instructions precisely. Return only the requested content with no preamble, " +
	"no meta-commentary, and no markdown code fences wrapping the entire response.";

async function runWithOpenAI(prompt: string, maxTokens = 8192): Promise<string> {
	try {
		const response = await chatgpt.responses.create({
			model: "gpt-4o",
			temperature: 0.7,
			input: [
				{ role: "system", content: CONTENT_SYSTEM_PROMPT },
				{ role: "user", content: prompt },
			],
			max_output_tokens: maxTokens,
		});
		return response.output_text?.trim() ?? "";
	} catch (err) {
		throw new ExternalServiceError(
			"OpenAI",
			"Failed to generate content.",
			502,
			{ model: "gpt-4o" },
			err,
		);
	}
}

async function runWithClaude(prompt: string, maxTokens = 8192): Promise<string> {
	try {
		const response = await claude.messages.create({
			model: "claude-sonnet-4-20250514",
			max_tokens: maxTokens,
			temperature: 0.7,
			system: CONTENT_SYSTEM_PROMPT,
			messages: [{ role: "user", content: prompt }],
		});
		const block = response.content[0];
		return block?.type === "text" ? block.text.trim() : "";
	} catch (err) {
		throw new ExternalServiceError(
			"Claude",
			"Failed to generate content.",
			502,
			{ model: "claude-sonnet-4-20250514" },
			err,
		);
	}
}

export async function generateContentText(prompt: string): Promise<string> {
	const text =
		env.CONTENT_LLM_PROVIDER === "claude"
			? await runWithClaude(prompt)
			: await runWithOpenAI(prompt);

	if (!text) {
		throw new ExternalServiceError(
			env.CONTENT_LLM_PROVIDER === "claude" ? "Claude" : "OpenAI",
			"LLM returned empty content.",
			502,
		);
	}

	return text;
}

export function extractTitleFromMarkdown(markdown: string): string {
	const h1Match = markdown.match(/^#\s+(.+)$/m);
	if (h1Match?.[1]) {
		return h1Match[1].trim();
	}

	const firstLine = markdown.split("\n").find((line) => line.trim().length > 0);
	return firstLine?.replace(/^#+\s*/, "").trim() ?? "Untitled Article";
}
