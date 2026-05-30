CREATE TYPE "public"."platform_type" AS ENUM('wordpress', 'shopify', 'custom_webhook');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('active', 'inactive', 'error');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('draft', 'queued', 'published');--> statement-breakpoint
ALTER TABLE "workspaces" ADD COLUMN "auto_pilot_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(256) NOT NULL,
	"platform_type" "platform_type" NOT NULL,
	"cms_url" varchar(512) NOT NULL,
	"auth_token_encrypted" text NOT NULL,
	"status" "integration_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_articles" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"workspace_id" varchar(256) NOT NULL,
	"keyword_id" varchar(256) NOT NULL,
	"title" varchar(512) NOT NULL,
	"markdown_body" text,
	"html_body" text,
	"featured_image_url" text,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_articles" ADD CONSTRAINT "generated_articles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "integrations_workspace_id_idx" ON "integrations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "generated_articles_workspace_id_idx" ON "generated_articles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "generated_articles_keyword_id_idx" ON "generated_articles" USING btree ("keyword_id");--> statement-breakpoint
CREATE INDEX "generated_articles_status_idx" ON "generated_articles" USING btree ("status");
