import { env } from "cloudflare:workers";
import { currentEmail, isAllowed } from "../auth";

async function setup() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, display_name TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
}

export async function PUT(req: Request) {
  await setup();
  const email = await currentEmail();
  if (!isAllowed(email)) return Response.json({ error: "email_not_allowed" }, { status: 403 });
  const body = await req.json() as { displayName?: string };
  const displayName = body.displayName?.trim();
  if (!displayName || displayName.length > 40) return Response.json({ error: "invalid_name" }, { status: 400 });
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (email,display_name,updated_at) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name, updated_at=excluded.updated_at").bind(email, displayName, now),
    env.DB.prepare("UPDATE bookings SET user_name=? WHERE user_email=?").bind(displayName, email),
  ]);
  return Response.json({ displayName });
}
