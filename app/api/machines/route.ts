import { env } from "cloudflare:workers";
import { currentIdentity, isAdmin } from "../auth";
import { parseMachineInput } from "../validation";

export async function POST(req: Request) {
  const identity = await currentIdentity();
  if (!isAdmin(identity.email, identity.local)) return Response.json({ error: "forbidden" }, { status: 403 });
  const body = parseMachineInput(await req.json());
  if (!body) return Response.json({ error: "invalid_machine" }, { status: 400 });
  const machine = await env.DB.prepare("INSERT INTO machines (name,spec,status) VALUES (?,?,?) RETURNING id,name,spec,status").bind(body.name, body.spec, body.status).first();
  return Response.json(machine, { status: 201 });
}
