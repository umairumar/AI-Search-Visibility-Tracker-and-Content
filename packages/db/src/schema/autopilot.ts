import { index, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { workspaces } from "./workspace.js";

export const platformTypeEnum = pgEnum("platform_type", [
	"wordpress",
	"shopify",
	"custom_webhook",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
	"active",
	"inactive",
	"error",
]);

export const articleStatusEnum = pgEnum("article_status", [
	"draft",
	"queued",
	"published",
]);

export const integrations = pgTable(
	"integrations",
	{
		id: varchar("id", { length: 256 }).primaryKey(),
		workspaceId: varchar("workspace_id", { length: 256 })
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		platformType: platformTypeEnum("platform_type").notNull(),
		cmsUrl: varchar("cms_url", { length: 512 }).notNull(),
		authTokenEncrypted: text("auth_token_encrypted").notNull(),
		status: integrationStatusEnum("status").default("active").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		workspaceIdx: index("integrations_workspace_id_idx").on(table.workspaceId),
	}),
);

export const generatedArticles = pgTable(
	"generated_articles",
	{
		id: varchar("id", { length: 256 }).primaryKey(),
		workspaceId: varchar("workspace_id", { length: 256 })
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
		// References ClickHouse analytics.user_prompts.id (cross-store, no PG FK)
		keywordId: varchar("keyword_id", { length: 256 }).notNull(),
		title: varchar("title", { length: 512 }).notNull(),
		markdownBody: text("markdown_body"),
		htmlBody: text("html_body"),
		featuredImageUrl: text("featured_image_url"),
		status: articleStatusEnum("status").default("draft").notNull(),
		publishedAt: timestamp("published_at"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => ({
		workspaceIdx: index("generated_articles_workspace_id_idx").on(
			table.workspaceId,
		),
		keywordIdx: index("generated_articles_keyword_id_idx").on(table.keywordId),
		statusIdx: index("generated_articles_status_idx").on(table.status),
	}),
);
