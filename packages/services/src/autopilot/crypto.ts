import {
	createCipheriv,
	createDecipheriv,
	randomBytes,
	scryptSync,
} from "node:crypto";
import { EnvError } from "@oneglanse/errors";
import { env } from "../env.js";

const ALGORITHM = "aes-256-gcm";
const SALT = "oneglanse-cms-token";

function getEncryptionKey(): Buffer {
	const secret = env.INTERNAL_CRON_SECRET?.trim();
	if (!secret) {
		throw new EnvError(
			"INTERNAL_CRON_SECRET",
			"INTERNAL_CRON_SECRET is required to encrypt CMS credentials.",
		);
	}
	return scryptSync(secret, SALT, 32);
}

export function encryptToken(plaintext: string): string {
	const key = getEncryptionKey();
	const iv = randomBytes(16);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	const encrypted = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	const tag = cipher.getAuthTag();
	return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptToken(ciphertext: string): string {
	const key = getEncryptionKey();
	const [ivB64, tagB64, dataB64] = ciphertext.split(":");
	if (!ivB64 || !tagB64 || !dataB64) {
		throw new Error("Invalid encrypted token format.");
	}

	const iv = Buffer.from(ivB64, "base64");
	const tag = Buffer.from(tagB64, "base64");
	const encrypted = Buffer.from(dataB64, "base64");
	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
		"utf8",
	);
}
