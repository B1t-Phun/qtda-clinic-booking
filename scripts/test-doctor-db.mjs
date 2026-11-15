import {readFileSync} from 'node:fs';
import projectEnv from './env.cjs';
const env=projectEnv.loadProjectEnv();
const ref=new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];
const response=await fetch('https://api.supabase.com/v1/projects/'+ref+'/database/query',{
  method:'POST',headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},
  body:JSON.stringify({query:readFileSync(new URL('../supabase/tests/doctor_workflow.sql',import.meta.url),'utf8'),read_only:false}),
  redirect:'error',signal:AbortSignal.timeout(30000),
});
if(!response.ok){
  const body=await response.json().catch(()=>null);
  let message=body?.message || 'Database test HTTP '+response.status;
  for(const secret of Object.values(env).filter(value=>typeof value==='string'&&value.length>6))message=message.split(secret).join('[redacted]');
  throw new Error(message);
}
const result=await response.json();
console.log(result[0]?.result || 'Doctor database workflow checks passed.');
