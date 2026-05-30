import { EnvError, ExternalServiceError } from "@oneglanse/errors";
import { env } from "../env.js";
import { chatgpt } from "../llm/index.js";

export async function generateFeaturedImage(imagePrompt: string): Promise<string> {
	if (!env.OPENAI_API_KEY) {
		throw new EnvError(
			"OPENAI_API_KEY",
			"Missing OpenAI API key required for DALL-E image generation.",
		);
	}

	try {
		const response = await chatgpt.images.generate({
			model: "dall-e-3",
			prompt: imagePrompt,
			n: 1,
			size: "1792x1024",
			quality: "standard",
			response_format: "url",
		});

		const url = response.data?.[0]?.url;
		if (!url) {
			throw new ExternalServiceError(
				"OpenAI",
				"DALL-E returned no image URL.",
				502,
			);
		}

		return url;
	} catch (err) {
		if (err instanceof EnvError || err instanceof ExternalServiceError) {
			throw err;
		}
		throw new ExternalServiceError(
			"OpenAI",
			"Failed to generate featured image.",
			502,
			{ model: "dall-e-3" },
			err,
		);
	}
}
