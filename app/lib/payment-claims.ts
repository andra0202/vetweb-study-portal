import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "crypto";

function paymentKey() {
  const secret = process.env.PAYMENT_ENCRYPTION_KEY || process.env.STUDY_SESSION_SIGNING_SECRET;
  if (!secret) throw new Error("payment_encryption_not_configured");
  return createHash("sha256").update(secret).digest();
}

export function normalizeGcashNumber(value: string) {
  const compact = value.replace(/[\s-]/g, "");
  if (!/^(?:\+63|0)9\d{9}$/.test(compact)) return null;
  return compact.startsWith("+63") ? `0${compact.slice(3)}` : compact;
}

export function encryptGcashNumber(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", paymentKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptGcashNumber(value: string) {
  const [version, ivPart, tagPart, ciphertextPart] = value.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !ciphertextPart) throw new Error("invalid_encrypted_number");
  const decipher = createDecipheriv("aes-256-gcm", paymentKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextPart, "base64url")), decipher.final()]).toString("utf8");
}

export function gcashDuplicateHash(normalizedNumber: string) {
  return createHmac("sha256", paymentKey()).update(`gcash:${normalizedNumber}`).digest("hex");
}

export function createReferenceCode() {
  return `VWS-${randomBytes(5).toString("hex").toUpperCase()}`;
}
