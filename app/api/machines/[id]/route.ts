import { env } from "cloudflare:workers";
import { currentIdentity, isAdmin } from "../../auth";
import { displayNameFor, writeAuditLog } from "../../audit";
import { parseMachineInput } from "../../validation";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await currentIdentity();
  if (!isAdmin(identity.email, identity.local)) return Response.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const body = parseMachineInput(await req.json());
  if (!body) return Response.json({ error: "invalid_machine" }, { status: 400 });
  const machine = await env.DB.prepare("UPDATE machines SET name=?,spec=?,status=? WHERE id=? RETURNING id,name,spec,status").bind(body.name, body.spec, body.status, id).first();
  if (!machine) return Response.json({ error: "not_found" }, { status: 404 });
  await writeAuditLog({ actorId: identity.userId, actorName: await displayNameFor(identity.userId), action: "machine_updated", targetType: "machine", targetId: id, summary: `${body.name}（${body.status}）` });
  return Response.json(machine);
}
