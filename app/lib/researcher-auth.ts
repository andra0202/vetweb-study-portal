import { createHmac, timingSafeEqual } from "crypto";

export const researcherCookieName = "vetweb_research_session";
const sessionDurationSeconds = 60 * 60 * 8;

function configuredPassword() {
  return process.env.RESEARCHER_DASHBOARD_PASSWORD || "";
}

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(expiresAt: number) {
  return createHmac("sha256", configuredPassword()).update(`vetweb-research:${expiresAt}`).digest("base64url");
}

export function researcherPasswordIsValid(password: string) {
  const expected = configuredPassword();
  return Boolean(expected) && secureEqual(password, expected);
}

export function createResearcherSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + sessionDurationSeconds;
  return { value: `${expiresAt}.${sign(expiresAt)}`, maxAge: sessionDurationSeconds };
}

export function researcherSessionIsValid(value: string | undefined) {
  if (!value) return false;
  const [expiresAtText, signature] = value.split(".");
  const expiresAt = Number(expiresAtText);
  return Number.isInteger(expiresAt) && expiresAt > Math.floor(Date.now() / 1000) && Boolean(signature) && secureEqual(signature, sign(expiresAt));
}
