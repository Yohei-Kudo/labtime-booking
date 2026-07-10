import { headers } from "next/headers";

export const ADMIN_EMAILS = new Set(["y.kudo@ist.hokudai.ac.jp"]);
export async function currentEmail() {
  const h = await headers();
  return (h.get("oai-authenticated-user-email") || "y.kudo@ist.hokudai.ac.jp").toLowerCase();
}
export function isAllowed(email:string) {
  return email.endsWith("@elms.hokudai.ac.jp") || email.endsWith("@ist.hokudai.ac.jp");
}
export function isAdmin(email:string) { return ADMIN_EMAILS.has(email); }
