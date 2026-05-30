import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	CONTENT_QUEUE_NAME,
	handleContentGenerationJob,
	waitForRedis,
} from "@oneglanse/services";
import type { ContentGenerationJobPayload } from "@oneglanse/types";
import { logger } from "@oneglanse/utils";
import { Worker } from "bullmq";
import dotenv from "dotenv";

const WORKER_LOCK_DURATION_MS = 30 * 60 * 1000;

const envFilePath = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
	"..",
	".env",
);

if (fs.existsSync(envFilePath)) {
	dotenv.config({ path: envFilePath });
}

const connection = {
	host: process.env.REDIS_HOST ?? "localhost",
	port: Number(process.env.REDIS_PORT ?? 6379),
	password: process.env.REDIS_PASSWORD,
};

async function startAutopilotWorker(): Promise<Worker> {
	await waitForRedis();

	const worker = new Worker<ContentGenerationJobPayload>(
		CONTENT_QUEUE_NAME,
		async (job) => {
			logger.log(
				`[autopilot] processing job ${job.id} for article ${job.data.articleId}`,
			);
			await handleContentGenerationJob(job.data);
		},
		{
			connection,
			concurrency: 2,
			lockDuration: WORKER_LOCK_DURATION_MS,
			stalledInterval: 60 * 1000,
			maxStalledCount: 3,
		},
	);

	worker.on("completed", (job) => {
		logger.log(`[autopilot] job completed ${job.id}`);
	});

	worker.on("failed", (job, err) => {
		logger.error(`[autopilot] job failed ${job?.id}`, err);
	});

	logger.log(
		`[autopilot] content worker started → queue: ${CONTENT_QUEUE_NAME} (concurrency=2)`,
	);

	return worker;
}

startAutopilotWorker().catch((err) => {
	logger.error("[autopilot] worker failed to start:", err);
	process.exit(1);
});
