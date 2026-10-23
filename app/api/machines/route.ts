import { env } from "cloudflare:workers";
import { currentIdentity, isAdmin } from "../auth";
import { displayNameFor, writeAuditLog } from "../audit";
import { parseMachineInput } from "../validation";

export async function POST(req: Request) {
  const identity = await currentIdentity();
  if (!isAdmin(identity.email, identity.local)) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = parseMachineInput(await req.json());
  if (!body) return Response.json({ error: "invalid_machine" }, { status: 400 });
  const machine = await env.DB.prepare("INSERT INTO machines (name,spec,status) VALUES (?,?,?) RETURNING id,name,spec,status").bind(body.name, body.spec, body.status).first();
  if (machine) await writeAuditLog({ actorId: identity.userId, actorName: await displayNameFor(identity.userId), action: "machine_created", targetType: "machine", targetId: String(machine.id), summary: `${body.name}（${body.status}）` });
  return Response.json(machine, { status: 201 });
}
