import { env } from "cloudflare:workers";
import { currentEmail, isAdmin, isAllowed } from "../auth";

async function setup() {
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS machines (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, spec TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'available')"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, machine_id INTEGER NOT NULL, user_email TEXT NOT NULL, user_name TEXT NOT NULL, usage_type TEXT NOT NULL, title TEXT NOT NULL, start_at TEXT NOT NULL, end_at TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS bookings_machine_time_idx ON bookings (machine_id, start_at, end_at)"),
  ]);
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM machines").first<{n:number}>();
  if (!count?.n) await env.DB.batch(
    [["750MHz EPR装置","EPR分光装置","available"],["M3","実験装置","available"],["X-band","X-band EPR装置","available"],["1.5T-MRI","1.5テスラ MRI装置","available"],["GPU-01","GPUサーバー · GPU 1枚","available"]]
      .map(x=>env.DB.prepare("INSERT INTO machines (name,spec,status) VALUES (?,?,?)").bind(...x))
  );
  const legacy = await env.DB.prepare("SELECT name FROM machines WHERE id=1").first<{name:string}>();
  if (count?.n === 6 && legacy?.name === "GPU-01") await env.DB.batch([
    env.DB.prepare("UPDATE machines SET name='750MHz EPR装置', spec='EPR分光装置', status='available' WHERE id=1"),
    env.DB.prepare("UPDATE machines SET name='M3', spec='実験装置', status='available' WHERE id=2"),
    env.DB.prepare("UPDATE machines SET name='X-band', spec='X-band EPR装置', status='available' WHERE id=3"),
    env.DB.prepare("UPDATE machines SET name='1.5T-MRI', spec='1.5テスラ MRI装置', status='available' WHERE id=4"),
    env.DB.prepare("UPDATE machines SET name='GPU-01', spec='GPUサーバー · GPU 1枚', status='available' WHERE id=5"),
    env.DB.prepare("DELETE FROM machines WHERE id=6"),
  ]);
}
export async function GET() { await setup(); const email=await currentEmail(); if(!isAllowed(email))return Response.json({error:"email_not_allowed"},{status:403}); const [m,b]=await Promise.all([env.DB.prepare("SELECT id,name,spec,status FROM machines ORDER BY id").all(),env.DB.prepare("SELECT id,machine_id AS machineId,user_email AS userEmail,user_name AS userName,usage_type AS usageType,title,start_at AS startAt,end_at AS endAt,note FROM bookings ORDER BY start_at").all()]); return Response.json({machines:m.results,bookings:b.results,currentEmail:email,isAdmin:isAdmin(email)}); }
export async function POST(req: Request) { await setup(); const body=await req.json() as Record<string, string|number>; const email=await currentEmail(); if(!isAllowed(email))return Response.json({error:"email_not_allowed"},{status:403}); const conflict=await env.DB.prepare("SELECT id FROM bookings WHERE machine_id=? AND start_at < ? AND end_at > ? LIMIT 1").bind(body.machineId,body.endAt,body.startAt).first(); if(conflict)return Response.json({error:"conflict"},{status:409}); const r=await env.DB.prepare("INSERT INTO bookings (machine_id,user_email,user_name,usage_type,title,start_at,end_at,note,created_at) VALUES (?,?,?,?,?,?,?,?,?) RETURNING id,machine_id AS machineId,user_email AS userEmail,user_name AS userName,usage_type AS usageType,title,start_at AS startAt,end_at AS endAt,note").bind(body.machineId,email,body.userName,body.usageType,body.title,body.startAt,body.endAt,body.note||"",new Date().toISOString()).first(); return Response.json(r,{status:201}); }
