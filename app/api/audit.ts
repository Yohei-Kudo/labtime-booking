import { env } from "cloudflare:workers";

export async function displayNameFor(userId: string) {
  const user = await env.DB.prepare("SELECT display_name AS displayName FROM users WHERE user_id=?").bind(userId).first<{ displayName: string }>();
  return user?.displayName || "表示名未登録";
}

export async function writeAuditLog(input: { actorId: string; actorName: string; action: string; targetType: string; targetId: string | number; summary: string }) {
  await env.DB.prepare("INSERT INTO audit_logs (actor_id,actor_name,action,target_type,target_id,summary,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(input.actorId, input.actorName, input.action, input.targetType, String(input.targetId), input.summary, new Date().toISOString()).run();
}
