import {NextResponse} from "next/server";
import {readdir,readFile} from "node:fs/promises";
import path from "node:path";
export const runtime="nodejs";
export async function GET(){
 const roots=[process.env.OPENCODE_SKILLS_DIR,path.join(process.cwd(),".agents","skills")].filter(Boolean) as string[];
 const skills:any[]=[];
 for(const root of roots){try{const entries=await readdir(root,{withFileTypes:true});for(const e of entries){if(!e.isDirectory())continue;const file=path.join(root,e.name,"SKILL.md");try{const raw=await readFile(file,"utf8");const desc=raw.match(/^description:\s*(.+)$/m)?.[1]||raw.split("\n").find(x=>x.trim()&&!x.startsWith("#"))||"Skill de agente";skills.push({name:e.name,description:desc.replace(/^['"]|['"]$/g,""),path:file})}catch{}}}catch{}}
 const unique=[...new Map(skills.map(s=>[s.name,s])).values()];return NextResponse.json({skills:unique,count:unique.length,source:roots});
}
