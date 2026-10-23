import { env } from "cloudflare:workers";
import { currentIdentity, isAdmin, isAllowed } from "../auth";
import { parseBookingInput } from "../validation";

async function ensureMachines() {
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM machines").first<{ n: number }>();
  if (!count?.n) {
    await env.DB.batch(
      [["750MHz EPR装置", "EPR分光装置", "available"], ["M3", "実験装置", "available"], ["X-band", "X-band EPR装置", "available"], ["1.5T-MRI", "1.5テスラ MRI装置", "available"], ["GPU-01", "GPUサーバー · GPU 1枚", "available"]]
        .map((row) => env.DB.prepare("INSERT INTO machines (name,spec,status) VALUES (?,?,?)").bind(...row)),
    );
  }
}

export async function GET() {
  const identity = await currentIdentity();
  if (!isAllowed(identity.email)) return Response.json({ error: "email_not_allowed" }, { status: 403 });
  await ensureMachines();
  const [machines, bookings, user] = await Promise.all([
    env.DB.prepare("SELECT id,name,spec,status FROM machines ORDER BY id").all(),
    env.DB.prepare("SELECT id,machine_id AS machineId,user_name AS userName,usage_type AS usageType,title,start_at AS startAt,end_at AS endAt,note,CASE WHEN user_id=? THEN 1 ELSE 0 END AS isMine FROM bookings ORDER BY start_at").bind(identity.userId).all(),
    env.DB.prepare("SELECT display_name AS displayName FROM users WHERE user_id=?").bind(identity.userId).first<{ displayName: string }>(),
  ]);
  return Response.json({ machines: machines.results, bookings: bookings.results, currentName: user?.displayName || null, isAdmin: isAdmin(identity.email, identity.local) });
}

export async function POST(req: Request) {
  const identity = await currentIdentity();
  if (!isAllowed(identity.email)) return Response.json({ error: "email_not_allowed" }, { status: 403 });
  const body = parseBookingInput(await req.json());
  if (!body) return Response.json({ error: "invalid_booking" }, { status: 400 });
  const machine = await env.DB.prepare("SELECT name,status FROM machines WHERE id=?").bind(body.machineId).first<{ name: string; status: string }>();
  if (!machine || machine.status !== "available") return Response.json({ error: "machine_unavailable" }, { status: 409 });
  if ((machine.name === "GPU-01") !== (body.usageType === "GPU" || body.usageType === "CPU")) return Response.json({ error: "invalid_usage_type" }, { status: 400 });
  const user = await env.DB.prepare("SELECT display_name AS displayName FROM users WHERE user_id=?").bind(identity.userId).first<{ displayName: string }>();
  if (!user?.displayName) return Response.json({ error: "profile_required" }, { status: 400 });
  const conflict = await env.DB.prepare("SELECT id FROM bookings WHERE machine_id=? AND start_at < ? AND end_at > ? LIMIT 1").bind(body.machineId, body.endAt, body.startAt).first();
  if (conflict) return Response.json({ error: "conflict" }, { status: 409 });
  const booking = await env.DB.prepare("INSERT INTO bookings (machine_id,user_id,user_name,usage_type,title,start_at,end_at,note,created_at) VALUES (?,?,?,?,?,?,?,?,?) RETURNING id,machine_id AS machineId,user_name AS userName,usage_type AS usageType,title,start_at AS startAt,end_at AS endAt,note").bind(body.machineId, identity.userId, user.displayName, body.usageType, body.title, body.startAt, body.endAt, body.note, new Date().toISOString()).first();
  return Response.json({ ...booking, isMine: true }, { status: 201 });
}
