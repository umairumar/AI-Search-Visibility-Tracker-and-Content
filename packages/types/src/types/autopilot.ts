export type ArticleStatus = "draft" | "queued" | "published";

export type PlatformType = "wordpress" | "shopify" | "custom_webhook";

export type ContentGenerationJobPayload = {
	jobId: string;
	articleId: string;
	workspaceId: string;
	userId: string;
	keywordId: string;
};

export type ContentGenerationContext = {
	workspaceId: string;
	keywordId: string;
	brandName: string;
	brandDomain: string;
	keywordPhrase: string;
};

export type ContentGenerationJobStatus =
	| "queued"
	| "collecting_context"
	| "generating_outline"
	| "generating_draft"
	| "generating_image"
	| "completed"
	| "failed";

export type ContentGenerationProgress = {
	status: ContentGenerationJobStatus;
	articleId: string;
	error?: string;
	updatedAt: string;
};

export type GeneratedArticleSummary = {
	id: string;
	workspaceId: string;
	keywordId: string;
	keywordPhrase: string | null;
	title: string;
	status: ArticleStatus;
	featuredImageUrl: string | null;
	publishedAt: string | null;
	createdAt: string;
};

export type SubmitContentGenerationArgs = {
	workspaceId: string;
	userId: string;
	keywordId: string;
};

export type SubmitContentGenerationResult =
	| { status: "queued"; jobId: string; articleId: string }
	| { status: "already_queued"; articleId: string }
	| { status: "keyword_not_found" };

export type SaveIntegrationInput = {
	platformType: PlatformType;
	cmsUrl: string;
	authToken: string;
};

export type PublishArticleResult = {
	articleId: string;
	platformType: string;
	externalUrl?: string;
};
