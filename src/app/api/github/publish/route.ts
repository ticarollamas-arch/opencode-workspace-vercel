import {NextRequest,NextResponse} from "next/server";
import JSZip from "jszip";
export const runtime="nodejs";
export const maxDuration=60;
const api="https://api.github.com";
export async function POST(req:NextRequest){
 try{
  const token=process.env.GITHUB_TOKEN;if(!token)return NextResponse.json({error:"Configure GITHUB_TOKEN no servidor."},{status:503});
  const form=await req.formData();const archive=form.get("archive"),repository=String(form.get("repository")||""),branch=String(form.get("branch")||"main");
  if(!(archive instanceof File)||!archive.name.toLowerCase().endsWith(".zip"))return NextResponse.json({error:"Envie um arquivo ZIP válido."},{status:400});
  if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))return NextResponse.json({error:"Repositório deve estar no formato owner/nome."},{status:400});
  if(archive.size>40*1024*1024)return NextResponse.json({error:"Este endpoint serverless aceita ZIPs de até 40 MB. Para 10 GB, use upload multipart em R2/S3 e processamento no executor persistente."},{status:413});
  const zip=await JSZip.loadAsync(await archive.arrayBuffer());const files:{path:string;content:string}[]=[];let total=0;
  for(const [name,item] of Object.entries(zip.files) as [string,JSZip.JSZipObject][]){if(item.dir)continue;const normalized=name.replace(/\\/g,"/");if(normalized.startsWith("/")||normalized.split("/").some(p=>p===".."))continue;const blob=await item.async("uint8array");total+=blob.byteLength;if(blob.byteLength>90*1024*1024)throw new Error(`Arquivo ${normalized} excede o limite de 90 MB por arquivo.`);files.push({path:normalized,content:Buffer.from(blob).toString("base64")});}
  if(!files.length)return NextResponse.json({error:"O ZIP não contém arquivos válidos."},{status:400});
  const headers={Authorization:`Bearer ${token}`,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"};
  async function gh(url:string,body?:unknown){const r=await fetch(url,{method:body?"POST":"GET",headers,body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw new Error(d.message||`GitHub API ${r.status}`);return d}
  const [owner,name]=repository.split("/");const base=`${api}/repos/${owner}/${name}`;
  const ref=await gh(`${base}/git/ref/heads/${encodeURIComponent(branch)}`);const parent=await gh(`${base}/git/commits/${ref.object.sha}`);
  const tree=[];for(const f of files){const blob=await gh(`${base}/git/blobs`,{content:f.content,encoding:"base64"});tree.push({path:f.path,mode:"100644",type:"blob",sha:blob.sha})}
  const newTree=await gh(`${base}/git/trees`,{base_tree:parent.tree.sha,tree});const commit=await gh(`${base}/git/commits`,{message:`Import project from ZIP (${files.length} files)`,tree:newTree.sha,parents:[parent.sha]});await gh(`${base}/git/refs/heads/${encodeURIComponent(branch)}`,{sha:commit.sha,force:false});
  return NextResponse.json({ok:true,message:`Publicado ${files.length} arquivos em ${repository} (${branch}).`,url:`https://github.com/${repository}/tree/${encodeURIComponent(branch)}`,files:files.length,totalBytes:total});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Falha ao publicar no GitHub."},{status:502})}
}
