import {readFileSync} from 'node:fs';
import projectEnv from './env.cjs';
const env=projectEnv.loadProjectEnv();
const ref=new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
async function query(sql,readOnly){
  const response=await fetch('https://api.supabase.com/v1/projects/'+ref+'/database/query',{
    method:'POST',headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},
    body:JSON.stringify({query:sql,read_only:readOnly}),redirect:'error',signal:AbortSignal.timeout(30000),
  });
  if(!response.ok){
    const body=await response.json().catch(()=>null);
    let message=body?.message || 'Database HTTP '+response.status;
    for(const secret of Object.values(env).filter(value=>typeof value==='string'&&value.length>6))message=message.split(secret).join('[redacted]');
    throw new Error(message);
  }
  return response.json();
}
const args=process.argv.slice(2);
if(args.some(arg=>arg!=='--apply'))throw new Error('Dùng --apply để triển khai doctor workflow.');
const preflight=await query("select count(*)::int as conflicts from (select slot_id from public.appointments where status in ('pending','confirmed','completed') group by slot_id having count(*)>1) c",true);
if(preflight[0]?.conflicts)throw new Error('Có nhiều lịch đang hiệu lực/hoàn thành dùng chung khung giờ. Cần xử lý dữ liệu trước khi triển khai.');
if(args.includes('--apply')){
  await query(readFileSync(new URL('../docs/20261113_doctor_workflow.sql',import.meta.url),'utf8'),false);
  const checks=await query("select to_regprocedure('public.doctor_manage_appointment(bigint,text,timestamp with time zone,text,text,bigint)') is not null as workflow_rpc, to_regclass('public.appointment_events') is not null as events, exists(select 1 from pg_policies where tablename='appointment_events') as events_rls",true);
  if(!checks[0]||Object.values(checks[0]).some(value=>value!==true))throw new Error('Migration chưa đạt điều kiện xác minh.');
  console.log('Doctor workflow migration applied and verified.');
}else console.log('Doctor workflow schema preflight passed. Use --apply to deploy.');
