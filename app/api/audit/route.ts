import { env } from "cloudflare:workers";
import { currentIdentity, isAdmin } from "../auth";

export async function GET() {
  const identity = await currentIdentity();
  if (!isAdmin(identity.email, identity.local)) return Response.json({ error: "forbidden" }, { status: 403 });
  const logs = await env.DB.prepare("SELECT id,actor_name AS actorName,action,target_type AS targetType,target_id AS targetId,summary,created_at AS createdAt FROM audit_logs ORDER BY created_at DESC,id DESC LIMIT 500").all();
  return Response.json({ logs: logs.results });
}
