import { NextRequest, NextResponse } from "next/server";
import { createOpencodeClient } from "@opencode-ai/sdk";
export const runtime = "nodejs";
export const maxDuration = 60;
function client(){const url=process.env.OPENCODE_SERVER_URL;if(!url)throw new Error("Configure OPENCODE_SERVER_URL no ambiente.");return createOpencodeClient({baseUrl:url,throwOnError:true,headers:process.env.OPENCODE_SERVER_PASSWORD?{Authorization:`Basic ${Buffer.from(`opencode:${process.env.OPENCODE_SERVER_PASSWORD}`).toString("base64")}`}:undefined})}
export async function POST(req:NextRequest){try{
 if(process.env.APP_ACCESS_TOKEN&&req.headers.get("x-app-token")!==process.env.APP_ACCESS_TOKEN)return NextResponse.json({error:"Não autorizado"},{status:401});
 const {sessionId,clientChatId,message,model}=await req.json();if(typeof message!=="string"||!message.trim())return NextResponse.json({error:"Mensagem vazia"},{status:400});
 const api=client();let id=typeof sessionId==="string"&&sessionId.length?sessionId:"";
 if(!id){const created=await api.session.create({body:{title:message.slice(0,72)}});id=created.data.id}
 const body:any={parts:[{type:"text",text:message}]};if(typeof model==="string"&&model.trim())body.model={providerID:process.env.OPENCODE_PROVIDER_ID||"openai",modelID:model};
 const result=await api.session.prompt({path:{id},body});const parts=result.data.parts||[];const text=parts.filter((p:any)=>p.type==="text").map((p:any)=>p.text).join("\n").trim();
 return NextResponse.json({sessionId:id,clientChatId,message:text||"Tarefa recebida pelo OpenCode.",parts});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Erro interno ao enviar instrução."},{status:502})}}
export async function DELETE(req:NextRequest){try{if(process.env.APP_ACCESS_TOKEN&&req.headers.get("x-app-token")!==process.env.APP_ACCESS_TOKEN)return NextResponse.json({error:"Não autorizado"},{status:401});const {sessionId}=await req.json();if(typeof sessionId!=="string"||!sessionId)throw new Error("Sessão não informada");await client().session.abort({path:{id:sessionId}});return NextResponse.json({ok:true})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível abortar."},{status:502})}}
