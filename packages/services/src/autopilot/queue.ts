import { Queue } from "bullmq";
import { env } from "../env.js";

export const CONTENT_QUEUE_NAME = "oneglanse-autopilot-content";

const DEFAULT_JOB_OPTIONS = {
	attempts: 2,
	backoff: { type: "exponential" as const, delay: 30_000 },
	removeOnComplete: true,
	removeOnFail: false,
};

const connection = {
	host: env.REDIS_HOST,
	port: env.REDIS_PORT,
	password: env.REDIS_PASSWORD,
};

let contentQueue: Queue | null = null;

export function getContentQueue(): Queue {
	if (!contentQueue) {
		contentQueue = new Queue(CONTENT_QUEUE_NAME, {
			connection,
			defaultJobOptions: DEFAULT_JOB_OPTIONS,
		});
	}
	return contentQueue;
}
