"use client";

import { api } from "@/trpc/react";
import { Button, toast } from "@oneglanse/ui";
import { cn } from "@oneglanse/utils";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export function GenerateGeoFixButton({
	workspaceId,
	keywordId,
	className,
}: {
	workspaceId: string;
	keywordId: string;
	className?: string;
}) {
	const [jobId, setJobId] = useState<string | null>(null);
	const utils = api.useUtils();

	const generateMutation = api.autopilot.generateArticle.useMutation({
		onSuccess: (result) => {
			if (result.status === "queued") {
				setJobId(result.jobId);
				toast.success("GEO fix article generation started.");
				void utils.autopilot.listArticles.invalidate({ workspaceId });
				return;
			}
			if (result.status === "already_queued") {
				toast.info("An article for this keyword is already being generated.");
				return;
			}
			toast.error("Keyword not found.");
		},
		onError: (error) => {
			toast.error(error.message || "Failed to start article generation.");
		},
	});

	const progressQuery = api.autopilot.getGenerationProgress.useQuery(
		{ workspaceId, jobId: jobId ?? "" },
		{
			enabled: !!jobId,
			refetchInterval: (query) => {
				const status = query.state.data?.status;
				if (!status || status === "completed" || status === "failed") {
					return false;
				}
				return 2000;
			},
		},
	);

	useEffect(() => {
		const status = progressQuery.data?.status;
		if (!status || status === "queued") {
			return;
		}
		if (status === "completed") {
			setJobId(null);
			void utils.autopilot.listArticles.invalidate({ workspaceId });
			toast.success("GEO fix article generated. View it in Autopilot.");
		}
		if (status === "failed") {
			setJobId(null);
			toast.error(progressQuery.data?.error ?? "Article generation failed.");
		}
	}, [progressQuery.data, utils.autopilot.listArticles, workspaceId]);

	const isGenerating = generateMutation.isPending || jobId !== null;

	return (
		<Button
			type="button"
			size="sm"
			variant="outline"
			className={cn(
				"shrink-0 border-violet-200 bg-violet-50/80 text-violet-800 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200 dark:hover:bg-violet-950/50",
				className,
			)}
			disabled={isGenerating}
			onClick={(event) => {
				event.stopPropagation();
				generateMutation.mutate({ workspaceId, keywordId });
			}}
		>
			{isGenerating ? (
				<Loader2 className="mr-1.5 size-3.5 animate-spin" />
			) : (
				<Sparkles className="mr-1.5 size-3.5" />
			)}
			Generate GEO Fix Article
		</Button>
	);
}

export function needsGeoFixArticle(args: {
	reason: "no-responses" | "unanalyzed" | "brand-not-mentioned" | null;
	metrics: {
		geoScore: number;
		visibility: number;
	} | null;
}): boolean {
	if (args.reason === "brand-not-mentioned") {
		return true;
	}
	if (args.metrics) {
		return args.metrics.geoScore < 35 || args.metrics.visibility < 35;
	}
	return false;
}
