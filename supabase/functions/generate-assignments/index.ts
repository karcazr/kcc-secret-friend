import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { generateAssignments } from '../../../src/lib/assignments.ts';

Deno.serve(async(req:Request)=>{
  const origin=Deno.env.get('APP_ORIGIN');
  const headers={'Access-Control-Allow-Origin':origin??'', 'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(!origin)return reply({error:'Server origin is not configured.'},503);
  if(req.headers.get('Origin')!==origin)return reply({error:'Origin not allowed.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply({error:'Method not allowed.'},405);
  try{
    const authorization=req.headers.get('Authorization');
    if(!authorization?.startsWith('Bearer '))return reply({error:'Sign in to continue.'},401);
    const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:authError}=await client.auth.getUser();
    if(authError||!user)return reply({error:'Sign in to continue.'},401);
    const {event}=await req.json();
    if(typeof event!=='string'||!/^[0-9a-f-]{36}$/i.test(event))return reply({error:'Invalid round.'},400);
    const {data,error}=await client.rpc('assignment_context',{p_event:event});
    if(error)return reply({error:error.code==='42501'?'Administrator access is required.':'Close registration and refresh before generating.'},error.code==='42501'?403:409);
    const edges=generateAssignments(data.participants,data.previous);
    const saved=await client.rpc('commit_assignments',{p_event:event,p_version:data.version,p_edges:edges});
    if(saved.error)return reply({error:'The round changed or was already generated. Refresh and try again.'},409);
    return reply({ok:true});
  }catch{return reply({error:'Generation failed. Confirm at least two participants and try again.'},400);}
});
