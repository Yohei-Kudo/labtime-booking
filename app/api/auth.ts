import { env } from "cloudflare:workers";
import { headers } from "next/headers";

type RuntimeConfig = { IDENTITY_PEPPER?: string; ADMIN_EMAILS?: string };

function config() {
  return env as unknown as RuntimeConfig;
}

function localRequest(host: string) {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

export async function currentIdentity() {
  const h = await headers();
  const host = h.get("host") || "";
  const local = localRequest(host);
  const email = (
    h.get("cf-access-authenticated-user-email") ||
    h.get("oai-authenticated-user-email") ||
    (local ? "y.kudo@ist.hokudai.ac.jp" : "")
  ).trim().toLowerCase();

  if (!email) throw new Error("authenticated_email_missing");
  const pepper = config().IDENTITY_PEPPER || (local ? "labtime-local-development-only" : "");
  if (!pepper) throw new Error("identity_pepper_missing");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email));
  const userId = Array.from(new Uint8Array(signed), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return { email, userId, local };
}

export function isAllowed(email: string) {
  return email.endsWith("@elms.hokudai.ac.jp") || email.endsWith("@ist.hokudai.ac.jp");
}

export function isAdmin(email: string, local = false) {
  const configured = (config().ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return configured.includes(email) || (local && email === "y.kudo@ist.hokudai.ac.jp");
}
