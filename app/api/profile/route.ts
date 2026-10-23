import { env } from "cloudflare:workers";
import { currentIdentity, isAllowed } from "../auth";

export async function PUT(req: Request) {
  const identity = await currentIdentity();
  if (!isAllowed(identity.email)) return Response.json({ error: "email_not_allowed" }, { status: 403 });
  const body = await req.json() as { displayName?: string };
  const displayName = body.displayName?.trim();
  if (!displayName || displayName.length > 40) return Response.json({ error: "invalid_name" }, { status: 400 });
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (user_id,display_name,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name, updated_at=excluded.updated_at").bind(identity.userId, displayName, now),
    env.DB.prepare("UPDATE bookings SET user_name=? WHERE user_id=?").bind(displayName, identity.userId),
  ]);
  return Response.json({ displayName });
}
