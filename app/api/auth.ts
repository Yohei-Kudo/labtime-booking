import { headers } from "next/headers";

export const ADMIN_EMAILS = new Set(["y.kudo@ist.hokudai.ac.jp"]);
export async function currentEmail() {
  const h = await headers();
  const host = h.get("host") || "";
  const localFallback = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "y.kudo@ist.hokudai.ac.jp" : "";
  return (h.get("cf-access-authenticated-user-email") || h.get("oai-authenticated-user-email") || localFallback).toLowerCase();
}
export function isAllowed(email:string) {
  return email.endsWith("@elms.hokudai.ac.jp") || email.endsWith("@ist.hokudai.ac.jp");
}
export function isAdmin(email:string) { return ADMIN_EMAILS.has(email); }
