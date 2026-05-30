import type { ContentGenerationContext } from "@oneglanse/types";

export function buildOutlinePrompt(context: ContentGenerationContext): string {
	return `You are an expert Generative Engine Optimization (GEO) content strategist.

Create a detailed blog post outline targeting the keyword phrase below. The outline must be optimized for AI search engines and answer engines (ChatGPT, Perplexity, Gemini, Google AI Overviews).

Brand: ${context.brandName}
Brand domain: ${context.brandDomain}
Target keyword phrase: "${context.keywordPhrase}"

Requirements:
- Structure the post with clear H2 and H3 sections
- Include a "Quick Answer" or "Definition" section near the top with a direct, concise answer
- Include sections for: key concepts, step-by-step guidance, comparison tables (describe table structure), FAQ (at least 5 questions), and a conclusion with a clear CTA mentioning ${context.brandName}
- Use data structures search engines prefer: numbered lists, bullet lists, comparison tables, FAQ schema-friendly Q&A pairs
- Naturally position ${context.brandName} as a relevant solution without being overly promotional
- Target 1,500+ words when fully written

Return ONLY the outline in markdown format. No preamble or commentary.`;
}

export function buildDraftPrompt(
	context: ContentGenerationContext,
	outline: string,
): string {
	const rootDomain = context.brandDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");

	return `You are an expert GEO content writer. Write a comprehensive, publish-ready blog post based on the outline below.

Brand: ${context.brandName}
Brand domain: ${rootDomain}
Target keyword phrase: "${context.keywordPhrase}"

OUTLINE:
${outline}

Requirements:
- Write approximately 1,500 words in pristine markdown format
- Start with an H1 title that includes the target keyword naturally
- Include a "Quick Answer" box near the top (use a blockquote or bold lead paragraph)
- Use clear definitions, direct answers, and structured data (lists, tables in markdown)
- Include 3-5 internal link placeholders using the brand's root domain, e.g. [learn more about ${context.brandName}](https://${rootDomain}/relevant-page-slug)
- Include an FAQ section with at least 5 questions and direct answers
- Mention ${context.brandName} naturally 2-4 times as a relevant solution
- End with a conclusion and soft CTA
- Do NOT include HTML tags — markdown only
- Do NOT include placeholder text like "[INSERT X HERE]" — write complete, publish-ready content

Return ONLY the markdown blog post. No preamble or commentary.`;
}

export function buildImagePrompt(context: ContentGenerationContext, title: string): string {
	return `Professional blog featured image for an article titled "${title}" about "${context.keywordPhrase}". Clean, modern, editorial style. No text overlays, no logos, no watermarks. Suitable as a website hero image. Photorealistic or high-quality illustration.`;
}
