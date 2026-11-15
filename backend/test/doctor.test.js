const {test}=require('node:test');
const assert=require('node:assert/strict');
const controller=require('../controllers/doctorController');
function fixture(body={},error=null){
  const calls=[];
  const req={params:{id:'1'},auth:{doctorId:'doctor-1'},body,supabase:{rpc:async(name,payload)=>{calls.push({name,payload});return{data:{id:1,status:'confirmed'},error};}}};
  const res={statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
  return{req,res,calls};
}
test('legacy doctor status endpoint uses the transactional RPC with an explicit version',async()=>{
  const f=fixture({status:'confirmed',expected_updated_at:'2026-11-13T00:00:00Z'});
  await controller.updateAppointmentStatus(f.req,f.res);
  assert.equal(f.res.statusCode,200);assert.equal(f.calls[0].name,'doctor_manage_appointment');
  assert.equal(f.calls[0].payload.p_action,'confirm');assert.equal(f.calls[0].payload.p_appointment_id,'1');
});
test('doctor status endpoint rejects reopening and missing versions before database calls',async()=>{
  for(const body of [{status:'pending',expected_updated_at:'2026-11-13T00:00:00Z'},{status:'confirmed'}]){
    const f=fixture(body);await controller.updateAppointmentStatus(f.req,f.res);assert.equal(f.res.statusCode,400);assert.equal(f.calls.length,0);
  }
});
test('doctor note endpoint preserves note and expected version in the guarded RPC',async()=>{
  const f=fixture({doctor_note:'A clinical note',expected_updated_at:'2026-11-13T00:00:00Z'});
  await controller.updateDoctorNote(f.req,f.res);
  assert.equal(f.calls[0].payload.p_action,'save_note');assert.equal(f.calls[0].payload.p_note,'A clinical note');
});
test('doctor endpoint returns conflict and ownership failures without internal details',async()=>{
  for(const [code,status]of [['40001',409],['42501',403],['P0002',404]]){
    const f=fixture({action:'start',expected_updated_at:'2026-11-13T00:00:00Z'},{code,message:'private database error'});
    await controller.manageAppointment(f.req,f.res);assert.equal(f.res.statusCode,status);assert.equal(JSON.stringify(f.res.body).includes('private database'),false);
  }
});

test('doctor profile endpoint rejects another doctor and protected role fields before writing', async () => {
  const f = fixture({ bio: 'changed' });
  f.req.params.id = 'other-doctor';
  await controller.updateDoctorProfile(f.req, f.res);
  assert.equal(f.res.statusCode, 403);
  assert.equal(f.calls.length, 0);
  f.req.params.id = f.req.auth.doctorId; f.req.body = { role: 'admin' };
  await controller.updateDoctorProfile(f.req, f.res);
  assert.equal(f.res.statusCode, 400);
});
test('appointment detail always includes the session doctor ID in its database filter', async () => {
  const f = fixture(), filters = [];
  f.req.query = {};
  const query = {
    select() { return query; }, eq(key, value) { filters.push([key, value]); return query; },
    single: async () => ({ data: null, error: { code: 'PGRST116', message: 'private detail' } }),
  };
  f.req.supabase.from = () => query;
  await controller.getDoctorAppointmentById(f.req, f.res);
  assert.equal(f.res.statusCode, 404);
  assert.ok(filters.some(([key, value]) => key === 'doctor_id' && value === f.req.auth.doctorId));
  assert.equal(JSON.stringify(f.res.body).includes('private detail'), false);
});
test('a combined profile save does not partially update tables when the optional RPC is absent', async () => {
  const f = fixture({ full_name: 'Doctor Test', bio: 'Updated introduction' }, { code: 'PGRST202' });
  f.req.params.id = f.req.auth.doctorId;
  await controller.updateDoctorProfile(f.req, f.res);
  assert.equal(f.res.statusCode, 409);
  assert.equal(f.calls[0].name, 'doctor_update_profile');
});
