import { db, schema } from "@oneglanse/db";
import type { Integration } from "@oneglanse/db";
import { NotFoundError, ValidationError } from "@oneglanse/errors";
import type { PlatformType } from "@oneglanse/types";
import { newId } from "@oneglanse/utils";
import { and, desc, eq } from "drizzle-orm";
import { decryptToken, encryptToken } from "./crypto.js";

export type IntegrationSummary = {
	id: string;
	workspaceId: string;
	platformType: PlatformType;
	cmsUrl: string;
	status: "active" | "inactive" | "error";
	createdAt: string;
};

export async function listIntegrations(args: {
	workspaceId: string;
}): Promise<IntegrationSummary[]> {
	const rows = await db
		.select({
			id: schema.integrations.id,
			workspaceId: schema.integrations.workspaceId,
			platformType: schema.integrations.platformType,
			cmsUrl: schema.integrations.cmsUrl,
			status: schema.integrations.status,
			createdAt: schema.integrations.createdAt,
		})
		.from(schema.integrations)
		.where(eq(schema.integrations.workspaceId, args.workspaceId))
		.orderBy(desc(schema.integrations.createdAt));

	return rows.map((row) => ({
		...row,
		createdAt: row.createdAt.toISOString(),
	}));
}

export async function saveIntegration(args: {
	workspaceId: string;
	platformType: PlatformType;
	cmsUrl: string;
	authToken: string;
}): Promise<IntegrationSummary> {
	const cmsUrl = args.cmsUrl.trim().replace(/\/$/, "");
	if (!cmsUrl.startsWith("http://") && !cmsUrl.startsWith("https://")) {
		throw new ValidationError("CMS URL must start with http:// or https://");
	}
	if (!args.authToken.trim()) {
		throw new ValidationError("Auth token is required.");
	}

	const id = newId("integration");
	const [integration] = await db
		.insert(schema.integrations)
		.values({
			id,
			workspaceId: args.workspaceId,
			platformType: args.platformType,
			cmsUrl,
			authTokenEncrypted: encryptToken(args.authToken.trim()),
			status: "active",
		})
		.returning({
			id: schema.integrations.id,
			workspaceId: schema.integrations.workspaceId,
			platformType: schema.integrations.platformType,
			cmsUrl: schema.integrations.cmsUrl,
			status: schema.integrations.status,
			createdAt: schema.integrations.createdAt,
		});

	if (!integration) {
		throw new Error("Failed to save integration.");
	}

	return {
		...integration,
		createdAt: integration.createdAt.toISOString(),
	};
}

export async function deleteIntegration(args: {
	workspaceId: string;
	integrationId: string;
}): Promise<void> {
	const deleted = await db
		.delete(schema.integrations)
		.where(
			and(
				eq(schema.integrations.id, args.integrationId),
				eq(schema.integrations.workspaceId, args.workspaceId),
			),
		)
		.returning({ id: schema.integrations.id });

	if (deleted.length === 0) {
		throw new NotFoundError("Integration not found.");
	}
}

export async function getActiveIntegration(args: {
	workspaceId: string;
}): Promise<(Integration & { authToken: string }) | null> {
	const [integration] = await db
		.select()
		.from(schema.integrations)
		.where(
			and(
				eq(schema.integrations.workspaceId, args.workspaceId),
				eq(schema.integrations.status, "active"),
			),
		)
		.orderBy(desc(schema.integrations.createdAt))
		.limit(1);

	if (!integration) return null;

	return {
		...integration,
		authToken: decryptToken(integration.authTokenEncrypted),
	};
}
