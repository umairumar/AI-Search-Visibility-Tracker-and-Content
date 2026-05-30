"use client";

import {
	formFieldClassName,
	formHintClassName,
	formLabelClassName,
	formPanelClassName,
	formPrimaryButtonClassName,
	formSecondaryButtonClassName,
} from "@/components/forms/auth-form-chrome";
import { useSafeSearchParams } from "@/lib/navigation/use-safe-search-params";
import { api } from "@/trpc/react";
import type { PlatformType } from "@oneglanse/types";
import {
	Button,
	Checkbox,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
	WorkspaceRequiredState,
	toast,
} from "@oneglanse/ui";
import { cn, formatDate } from "@oneglanse/utils";
import { ExternalLink, Loader2, Plug, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const PLATFORM_LABELS: Record<PlatformType, string> = {
	wordpress: "WordPress",
	shopify: "Shopify",
	custom_webhook: "Custom Webhook",
};

function StatusBadge({ status }: { status: string }) {
	const styles =
		status === "published"
			? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
			: status === "queued"
				? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
				: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

	return (
		<span
			className={cn(
				"inline-flex rounded-[var(--app-radius)] px-2 py-0.5 text-xs font-medium capitalize",
				styles,
			)}
		>
			{status}
		</span>
	);
}

export default function AutopilotPage() {
	const searchParams = useSafeSearchParams();
	const workspaceId = searchParams.get("workspace") ?? "";

	const workspaceQuery = api.workspace.getById.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);
	const articlesQuery = api.autopilot.listArticles.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId, refetchInterval: 5000 },
	);
	const integrationsQuery = api.autopilot.listIntegrations.useQuery(
		{ workspaceId },
		{ enabled: !!workspaceId },
	);

	const setAutoPilotMutation = api.workspace.setAutoPilotEnabled.useMutation({
		onSuccess: () => {
			void workspaceQuery.refetch();
			toast.success("Autopilot settings updated.");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to update autopilot settings.");
		},
	});

	const saveIntegrationMutation = api.autopilot.saveIntegration.useMutation({
		onSuccess: () => {
			void integrationsQuery.refetch();
			setPlatformType("wordpress");
			setCmsUrl("");
			setAuthToken("");
			toast.success("Integration saved.");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to save integration.");
		},
	});

	const deleteIntegrationMutation = api.autopilot.deleteIntegration.useMutation({
		onSuccess: () => {
			void integrationsQuery.refetch();
			toast.success("Integration removed.");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to remove integration.");
		},
	});

	const publishMutation = api.autopilot.publishArticle.useMutation({
		onSuccess: (result) => {
			void articlesQuery.refetch();
			if (result.externalUrl) {
				toast.success(`Article published: ${result.externalUrl}`);
			} else {
				toast.success("Article published.");
			}
		},
		onError: (error) => {
			toast.error(error.message || "Failed to publish article.");
		},
	});

	const [platformType, setPlatformType] = useState<PlatformType>("wordpress");
	const [cmsUrl, setCmsUrl] = useState("");
	const [authToken, setAuthToken] = useState("");

	if (!workspaceId) {
		return (
			<WorkspaceRequiredState
				icon={Sparkles}
				title="Pick a Workspace"
				description="Open a workspace to manage content autopilot."
			/>
		);
	}

	const autoPilotEnabled = workspaceQuery.data?.autoPilotEnabled ?? false;
	const articles = articlesQuery.data ?? [];
	const integrations = integrationsQuery.data ?? [];

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
			<div className="flex flex-col gap-2">
				<div className="flex items-center gap-2">
					<Sparkles className="size-5 text-violet-600 dark:text-violet-400" />
					<h2 className="text-lg font-semibold tracking-[-0.02em] text-gray-950 dark:text-gray-50">
						Content Autopilot
					</h2>
				</div>
				<p className="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
					Automatically generate GEO-optimized articles for keywords where your
					brand has low visibility, then publish to your CMS.
				</p>
			</div>

			<section className={formPanelClassName}>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 className="text-sm font-medium text-gray-950 dark:text-gray-50">
							Enable Content Autopilot
						</h3>
						<p className={formHintClassName}>
							When enabled, the system will automatically pick up un-optimized
							keywords on a weekly schedule.
						</p>
					</div>
					<label className="flex items-center gap-3">
						<Checkbox
							checked={autoPilotEnabled}
							disabled={setAutoPilotMutation.isPending || workspaceQuery.isLoading}
							onCheckedChange={(checked) => {
								setAutoPilotMutation.mutate({
									workspaceId,
									autoPilotEnabled: checked === true,
								});
							}}
						/>
						<span className="text-sm text-gray-700 dark:text-gray-300">
							{autoPilotEnabled ? "Enabled" : "Disabled"}
						</span>
					</label>
				</div>
			</section>

			<section className={formPanelClassName}>
				<div className="mb-4 flex items-center gap-2">
					<Plug className="size-4 text-gray-500" />
					<h3 className="text-sm font-medium text-gray-950 dark:text-gray-50">
						Integrations Manager
					</h3>
				</div>

				<form
					className="grid gap-4 md:grid-cols-2"
					onSubmit={(event) => {
						event.preventDefault();
						saveIntegrationMutation.mutate({
							workspaceId,
							platformType,
							cmsUrl,
							authToken,
						});
					}}
				>
					<div className={formFieldClassName}>
						<Label className={formLabelClassName}>Platform</Label>
						<Select
							value={platformType}
							onValueChange={(value) => setPlatformType(value as PlatformType)}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select platform" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="wordpress">WordPress</SelectItem>
								<SelectItem value="shopify">Shopify</SelectItem>
								<SelectItem value="custom_webhook">Custom Webhook</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className={formFieldClassName}>
						<Label className={formLabelClassName}>CMS URL</Label>
						<Input
							value={cmsUrl}
							onChange={(event) => setCmsUrl(event.target.value)}
							placeholder={
								platformType === "custom_webhook"
									? "https://hooks.example.com/publish"
									: "https://yourblog.com"
							}
							required
						/>
						<p className={formHintClassName}>
							{platformType === "wordpress"
								? "Your WordPress site URL. Auth token format: username:application_password"
								: platformType === "custom_webhook"
									? "Webhook endpoint that accepts JSON article payloads."
									: "Shopify store URL (coming soon)."}
						</p>
					</div>

					<div className={cn(formFieldClassName, "md:col-span-2")}>
						<Label className={formLabelClassName}>
							{platformType === "wordpress"
								? "Application Password"
								: "API Token / Bearer Token"}
						</Label>
						<Input
							type="password"
							value={authToken}
							onChange={(event) => setAuthToken(event.target.value)}
							placeholder={
								platformType === "wordpress"
									? "admin:xxxx xxxx xxxx xxxx xxxx xxxx"
									: "Your API token"
							}
							required
						/>
					</div>

					<div className="md:col-span-2">
						<Button
							type="submit"
							className={formPrimaryButtonClassName}
							disabled={saveIntegrationMutation.isPending}
						>
							{saveIntegrationMutation.isPending ? (
								<Loader2 className="mr-2 size-4 animate-spin" />
							) : null}
							Save Integration
						</Button>
					</div>
				</form>

				{integrationsQuery.isLoading ? (
					<div className="mt-6 space-y-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : integrations.length > 0 ? (
					<div className="mt-6 overflow-hidden rounded-[var(--app-radius)] border border-gray-200/80 dark:border-gray-800">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Platform</TableHead>
									<TableHead>URL</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-[80px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{integrations.map((integration) => (
									<TableRow key={integration.id}>
										<TableCell>
											{PLATFORM_LABELS[integration.platformType]}
										</TableCell>
										<TableCell className="max-w-[240px] truncate">
											{integration.cmsUrl}
										</TableCell>
										<TableCell>
											<StatusBadge status={integration.status} />
										</TableCell>
										<TableCell>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() =>
													deleteIntegrationMutation.mutate({
														workspaceId,
														integrationId: integration.id,
													})
												}
											>
												<Trash2 className="size-4" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				) : (
					<p className={cn(formHintClassName, "mt-4")}>
						No integrations configured yet.
					</p>
				)}
			</section>

			<section className={formPanelClassName}>
				<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h3 className="text-sm font-medium text-gray-950 dark:text-gray-50">
							Generated Articles
						</h3>
						<p className={formHintClassName}>
							Articles created by the autopilot engine for weak keywords.
						</p>
					</div>
					<Link
						href={`/prompts?workspace=${workspaceId}`}
						className={formSecondaryButtonClassName}
					>
						View prompts
					</Link>
				</div>

				{articlesQuery.isLoading ? (
					<div className="space-y-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				) : articles.length === 0 ? (
					<p className={formHintClassName}>
						No articles generated yet. Use{" "}
						<span className="font-medium">Generate GEO Fix Article</span> on the
						Prompts page for keywords with low visibility.
					</p>
				) : (
					<div className="overflow-x-auto rounded-[var(--app-radius)] border border-gray-200/80 dark:border-gray-800">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Title</TableHead>
									<TableHead>Target Keyword</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Published</TableHead>
									<TableHead className="w-[120px]" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{articles.map((article) => (
									<TableRow key={article.id}>
										<TableCell className="max-w-[220px] font-medium">
											{article.title}
										</TableCell>
										<TableCell className="max-w-[220px] truncate text-gray-600 dark:text-gray-400">
											{article.keywordPhrase ?? article.keywordId}
										</TableCell>
										<TableCell>
											<StatusBadge status={article.status} />
										</TableCell>
										<TableCell className="text-sm text-gray-600 dark:text-gray-400">
											{article.publishedAt
												? formatDate(article.publishedAt)
												: "—"}
										</TableCell>
										<TableCell>
											{article.status === "draft" ? (
												<Button
													type="button"
													size="sm"
													variant="outline"
													disabled={publishMutation.isPending}
													onClick={() =>
														publishMutation.mutate({
															workspaceId,
															articleId: article.id,
														})
													}
												>
													Publish
												</Button>
											) : article.status === "published" ? (
												<ExternalLink className="size-4 text-gray-400" />
											) : (
												<Loader2 className="size-4 animate-spin text-gray-400" />
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</section>
		</div>
	);
}
