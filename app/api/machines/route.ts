import { env } from "cloudflare:workers";
import { currentEmail, isAdmin } from "../auth";
export async function POST(req:Request){if(!isAdmin(await currentEmail()))return Response.json({error:"forbidden"},{status:403});const b=await req.json() as Record<string,string>;const r=await env.DB.prepare("INSERT INTO machines (name,spec,status) VALUES (?,?,?) RETURNING id,name,spec,status").bind(b.name,b.spec||"",b.status||"available").first();return Response.json(r,{status:201})}
