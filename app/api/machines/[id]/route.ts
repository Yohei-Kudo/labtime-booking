import { env } from "cloudflare:workers";
import { currentEmail, isAdmin } from "../../auth";
export async function PUT(req:Request,{params}:{params:Promise<{id:string}>}){if(!isAdmin(await currentEmail()))return Response.json({error:"forbidden"},{status:403});const {id}=await params;const b=await req.json() as Record<string,string>;const r=await env.DB.prepare("UPDATE machines SET name=?,spec=?,status=? WHERE id=? RETURNING id,name,spec,status").bind(b.name,b.spec||"",b.status||"available",id).first();return Response.json(r)}
