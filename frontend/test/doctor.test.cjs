/* eslint-disable @typescript-eslint/no-require-imports */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('../node_modules/typescript');
function load(relative,imports={},globals={}){
  const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'..',relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const loadedModule={exports:{}};
  vm.runInNewContext(code,{module:loadedModule,exports:loadedModule.exports,require:name=>{if(name==='server-only')return {};if(name in imports)return imports[name];throw new Error('Unexpected import '+name);},URL,Response,Request,Headers,Buffer,process,AbortSignal,...globals});
  return loadedModule.exports;
}
const http=load('src/lib/auth/http.ts',{'next/server':{NextResponse:{json:(body,options)=>Response.json(body,options)}}});
const workflow=load('src/modules/doctor/workflow.ts');
const snapshot=load('src/lib/doctor/snapshot.ts',{'@/lib/auth/http':http});
const now=new Date('2026-11-13T04:00:00Z');
const slot=(id,date='2026-11-13')=>({id,slot_date:date,start_time:'09:00:00',end_time:'09:30:00'});
test('clinic dates follow Vietnam across UTC midnight; slots represent the correct instant',()=>{
  assert.equal(workflow.clinicDate(new Date('2026-11-12T18:00:00Z')),'2026-11-13');
  assert.equal(workflow.slotInstant(slot('1')),Date.parse('2026-11-13T02:00:00Z'));
});
test('queue contains arrived confirmed patients for today, puts current examination first and sorts arrivals',()=>{
  const appointments=[
    {id:'1',slot_id:'1',status:'confirmed',checked_in_at:'2026-11-13T02:00:00Z',started_at:null},
    {id:'2',slot_id:'2',status:'confirmed',checked_in_at:'2026-11-13T02:05:00Z',started_at:'2026-11-13T02:06:00Z'},
    {id:'3',slot_id:'3',status:'confirmed',checked_in_at:null,started_at:null},
    {id:'4',slot_id:'4',status:'completed',checked_in_at:'x',started_at:'x'},
    {id:'5',slot_id:'5',status:'confirmed',checked_in_at:'x',started_at:null},
  ];
  const rows=workflow.queueAppointments(appointments,[slot('1'),slot('2'),slot('3'),slot('4'),slot('5','2026-11-14')],now);
  assert.deepEqual(Array.from(rows,row=>row.id),['2','1']);
  assert.equal(workflow.stage(appointments[1]),'ongoing');
  assert.equal(workflow.stage(appointments[0]),'waiting');
});
test('CSV escapes quotes and neutralizes spreadsheet formulas',()=>{
  const result=workflow.csvText([['=HYPERLINK("bad")','a,b','quoted"text'],[' +SUM(1,2)','normal','@value']]);
  assert.ok(result.startsWith('\uFEFF'));
  assert.ok(result.includes('HYPERLINK(""bad"")'));
  assert.ok(result.includes('"a,b"'));
  assert.ok(result.includes("'@value"));
});
function harness({role='doctor',needsMfa=false,authenticated=true,rpcError=null}={}){
  const calls=[];
  const query={
    select(){return query;},eq(key,value){calls.push(['eq',key,value]);return query;},
    single:async()=>({data:{id:'doctor-1',profile_id:'user-1',specialty_id:1},error:null}),
    insert:async rows=>{calls.push(['insert',rows]);return {error:null};},
  };
  const client={from(table){calls.push(['from',table]);return query;},rpc:async(name,body)=>{calls.push(['rpc',name,body]);return{data:{id:1,status:'confirmed'},error:rpcError};}};
  const route=load('src/app/api/doctor/[action]/route.ts',{
    '@/lib/auth/server':{createServerSupabase:async()=>client,readIdentity:async()=>({user:authenticated?{id:'user-1',role}:null,needsMfa})},
    '@/lib/auth/http':http,'@/lib/doctor/snapshot':snapshot,
  });
  return {calls,post:(action,body,origin='http://localhost:3000')=>route.POST(new Request('http://localhost:3000/api/doctor/'+action,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),{params:Promise.resolve({action})})};
}
process.env.APP_URL='http://localhost:3000';
const action={appointmentId:'1',action:'confirm',expectedUpdatedAt:'2026-11-13T00:00:00Z'};
test('doctor API blocks anonymous, other roles, missing MFA and cross-origin actions',async()=>{
  for(const [options,status] of [[{authenticated:false},401],[{role:'patient'},403],[{role:'admin'},403],[{needsMfa:true},403]]){
    const h=harness(options);assert.equal((await h.post('appointment',action)).status,status);assert.equal(h.calls.some(c=>c[0]==='rpc'),false);
  }
  const h=harness();assert.equal((await h.post('appointment',action,'https://evil.invalid')).status,403);
});
test('doctor API derives identity from session and sends the expected version to transactional RPC',async()=>{
  const h=harness(),response=await h.post('appointment',action);
  assert.equal(response.status,200);
  const rpc=h.calls.find(c=>c[0]==='rpc');
  assert.equal(rpc[1],'doctor_manage_appointment');
  assert.equal(rpc[2].p_expected_updated_at,action.expectedUpdatedAt);
  assert.equal('doctor_id' in rpc[2],false);
  assert.ok(h.calls.some(c=>c[0]==='eq'&&c[1]==='profile_id'&&c[2]==='user-1'));
  assert.equal((await response.json()).appointment.id,'1');
});
test('doctor API rejects forged IDs, invalid actions, missing versions and oversized notes',async()=>{
  for(const payload of [{...action,doctorId:'other'},{...action,action:'pending'},{...action,expectedUpdatedAt:null},{...action,note:'x'.repeat(10001)},{...action,appointmentId:'1 OR 1=1'}]){
    const h=harness();assert.ok([400,413].includes((await h.post('appointment',payload)).status));assert.equal(h.calls.some(c=>c[0]==='rpc'),false);
  }
});
test('optimistic concurrency and database ownership failures have usable HTTP status codes',async()=>{
  for(const [code,status] of [['40001',409],['23505',409],['42501',403],['P0002',404]]){
    assert.equal((await harness({rpcError:{code,message:'private db detail'}}).post('appointment',action)).status,status);
  }
});
test('slot creation validates interval, batch size and derives doctor ownership',async()=>{
  const future=new Date();future.setUTCFullYear(future.getUTCFullYear()+1);const date=future.toISOString().slice(0,10);
  const valid={slot_date:date,start_time:'08:00',end_time:'08:30'};
  for(const slots of [[{...valid,doctor_id:'other'}],[{...valid,end_time:'07:00'}],[{...valid,slot_date:'2000-01-01'}],Array(41).fill(valid)]){
    const h=harness();assert.equal((await h.post('slots',{slots})).status,400);assert.equal(h.calls.some(c=>c[0]==='insert'),false);
  }
  const h=harness();assert.equal((await h.post('slots',{slots:[valid]})).status,200);
  assert.equal(h.calls.find(c=>c[0]==='insert')[1][0].doctor_id,'doctor-1');
});

test('doctor API accepts long Vietnamese notes within the documented 10000-character limit',async()=>{const h=harness();const response=await h.post('appointment',{...action,action:'save_note',note:'Khám tốt. '.repeat(900)});assert.equal(response.status,200);assert.equal(h.calls.find(c=>c[0]==='rpc')[2].p_note.length,9000);});

test('snapshot paginates owned appointments and slots, and fetches only their patients',async()=>{
 const calls=[];
 function query(table){const state={table,filters:[]};const q={select(){return q},eq(key,value){state.filters.push([key,value]);return q},order(){return q},single:async()=>({data:table==='doctors'?{id:'doctor-1',profile_id:'user-1',specialty_id:1}:{id:1,full_name:'Doctor'},error:null}),range:async(from,to)=>{calls.push({...state,from,to});const data=table==='appointments'&&from===0?Array.from({length:500},(_,n)=>({id:n+1,patient_id:'patient-1',doctor_id:'doctor-1',slot_id:1})):table==='appointments'&&from===500?[{id:501,patient_id:'patient-2',doctor_id:'doctor-1',slot_id:2}]:table==='time_slots'?[{id:1,doctor_id:'doctor-1'}]:[];return{data,error:null}},limit:async()=>({data:[],error:null}),in:async(key,values)=>{calls.push({table,key,values});return{data:values.map(id=>({id,full_name:'Patient'})),error:null}}};return q;}
 const route=load('src/app/api/doctor/[action]/route.ts',{'@/lib/auth/server':{createServerSupabase:async()=>({from:query}),readIdentity:async()=>({user:{id:'user-1',role:'doctor'},needsMfa:false})},'@/lib/auth/http':http,'@/lib/doctor/snapshot':snapshot});
 const response=await route.GET(new Request('http://localhost:3000/api/doctor/snapshot'),{params:Promise.resolve({action:'snapshot'})});
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.appointments.length,501);assert.equal(data.patients.length,2);assert.equal(data.appointments[0].id,'1');assert.equal(data.doctor.id,'doctor-1');
 for(const call of calls.filter(c=>c.table==='appointments'||c.table==='time_slots'))assert.ok(call.filters.some(([key,value])=>key==='doctor_id'&&value==='doctor-1'));
 assert.ok(calls.some(c=>c.table==='profiles'&&c.values.includes('patient-2')));
});

test('calendar day arithmetic handles empty dates, invalid dates, month boundaries and leap years',()=>{assert.equal(workflow.addClinicDays('',1),'');assert.equal(workflow.addClinicDays('2026-02-31',1),'');assert.equal(workflow.addClinicDays('2024-02-28',1),'2024-02-29');assert.equal(workflow.addClinicDays('2026-11-30',1),'2026-12-01');});

test('doctor provider renders the page on the server from its initial snapshot without waiting for a client fetch',()=>{
  const React=require('../node_modules/react');
  const {renderToStaticMarkup}=require('../node_modules/react-dom/server');
  const filename=path.resolve(__dirname,'../src/modules/doctor/store/store.tsx');
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
  }).outputText;
  const loadedModule={exports:{}};
  const user={id:'doctor-user',role:'doctor'};
  vm.runInNewContext(code,{
    module:loadedModule,exports:loadedModule.exports,
    require:name=>{
      if(name==='react')return React;
      if(name==='react/jsx-runtime')return require('../node_modules/react/jsx-runtime');
      if(name==='@/lib/auth/context')return {useAuth:()=>({user,logout:()=>{}})};
      throw new Error('Unexpected provider import '+name);
    },
    fetch:()=>assert.fail('Initial rendering must use the server snapshot'),AbortSignal,
  });
  const {DoctorProvider,useDoctorStore}=loadedModule.exports;
  function Page(){
    const state=useDoctorStore();
    return React.createElement('h1',null,'Rendered doctor page: '+state.profile.full_name+' / '+state.appointments[0].doctor_note);
  }
  const initialSnapshot={
    profile:{id:user.id,full_name:'Doctor',phone:null,date_of_birth:null},
    doctor:{id:'doctor-id'},specialty:null,patients:[],
    appointments:[{id:'1',reason:null,doctor_note:null,cancel_reason:null}],slots:[],events:[],
  };
  const html=renderToStaticMarkup(React.createElement(DoctorProvider,{initialSnapshot},React.createElement(Page)));
  assert.match(html,/<h1>Rendered doctor page: Doctor \/ <\/h1>/);
  assert.equal(html.includes('Đang tải lịch khám từ Supabase'),false);
});
