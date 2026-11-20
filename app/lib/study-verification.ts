import { createHmac, timingSafeEqual } from "crypto";

const verified = new Map<string, number>();
// Participants complete several real VetWeb tasks. Keep one signed study
// session usable long enough to recover from a refresh or app switch.
const ttlMs = 2 * 60 * 60_000;
const secret = () => process.env.STUDY_SESSION_SIGNING_SECRET || "";
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

export function createStudyState() {
  if (!secret()) throw new Error("Study session signing is not configured");
  const id = crypto.randomUUID(); const expiresAt = Date.now() + ttlMs;
  const body = `${id}.${expiresAt}`;
  return { id, state: `${body}.${sign(body)}`, expiresAt };
}

export function verifyStudyState(state: unknown) {
  if (!secret() || typeof state !== "string") return null;
  const [id, expiresAtText, signature, extra] = state.split(".");
  const expiresAt = Number(expiresAtText); const expected = sign(`${id}.${expiresAtText}`);
  if (extra || !id || !Number.isFinite(expiresAt) || expiresAt < Date.now() || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  return { id, expiresAt };
}

export function markVerified(id: string, expiresAt: number) { verified.set(id, expiresAt); }
export function isVerified(id: string) { const expiresAt = verified.get(id); if (!expiresAt || expiresAt < Date.now()) { verified.delete(id); return false; } return true; }
