import { env } from "cloudflare:workers";
import { currentIdentity, isAdmin } from "../../auth";
import { parseBookingInput } from "../../validation";

async function canEdit(id: string, userId: string, admin: boolean) {
  const row = await env.DB.prepare("SELECT user_id AS userId FROM bookings WHERE id=?").bind(id).first<{ userId: string }>();
  return !!row && (row.userId === userId || admin);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await currentIdentity();
  if (!(await canEdit(id, identity.userId, isAdmin(identity.email, identity.local)))) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = parseBookingInput(await req.json());
  if (!body) return Response.json({ error: "invalid_booking" }, { status: 400 });
  const machine = await env.DB.prepare("SELECT name,status FROM machines WHERE id=?").bind(body.machineId).first<{ name: string; status: string }>();
  if (!machine || machine.status !== "available") return Response.json({ error: "machine_unavailable" }, { status: 409 });
  if ((machine.name === "GPU-01") !== (body.usageType === "GPU" || body.usageType === "CPU")) return Response.json({ error: "invalid_usage_type" }, { status: 400 });
  const conflict = await env.DB.prepare("SELECT id FROM bookings WHERE machine_id=? AND id<>? AND start_at < ? AND end_at > ? LIMIT 1").bind(body.machineId, id, body.endAt, body.startAt).first();
  if (conflict) return Response.json({ error: "conflict" }, { status: 409 });
  const booking = await env.DB.prepare("UPDATE bookings SET machine_id=?,usage_type=?,title=?,start_at=?,end_at=?,note=? WHERE id=? RETURNING id,machine_id AS machineId,user_name AS userName,usage_type AS usageType,title,start_at AS startAt,end_at AS endAt,note,CASE WHEN user_id=? THEN 1 ELSE 0 END AS isMine").bind(body.machineId, body.usageType, body.title, body.startAt, body.endAt, body.note, id, identity.userId).first();
  return Response.json(booking);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await currentIdentity();
  if (!(await canEdit(id, identity.userId, isAdmin(identity.email, identity.local)))) return Response.json({ error: "forbidden" }, { status: 403 });
  await env.DB.prepare("DELETE FROM bookings WHERE id=?").bind(id).run();
  return new Response(null, { status: 204 });
}
