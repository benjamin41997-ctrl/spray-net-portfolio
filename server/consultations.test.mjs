import test from 'node:test';
import assert from 'node:assert/strict';
import {consultationFixture,fixtureImage,accessToken} from '../tests/consultation-fixture.mjs';

const id='11111111-1111-4111-8111-111111111111';
const photo=(index=0,mode='kitchen')=>({id:`photo-${mode}-${String(index).padStart(16,'0')}`,mode,name:`Angle ${index}`,width:1200,height:800});
const design={mode:'kitchen',surfaces:{cabinets:'sw-7008'},hardwareStyle:'keep',hardwareFinish:'keep',backsplash:'keep',countertop:'keep'};
const create=h=>h.request('/api/consultations',{action:'create',id,name:'Smith Kitchen'});
const upload=(h,p=photo())=>h.request('/api/consultations',{action:'photo',consultationId:id,photo:p,image:fixtureImage});

test('shared consultations require tablet access and representative access protects the archive and session controls',async()=>{
  const h=consultationFixture();assert.equal((await h.request('/api/consultations/active',undefined,false,'bad')).status,401);
  assert.equal((await h.request('/api/consultations',undefined,false)).status,403);
  assert.equal((await h.request('/api/consultations',{action:'create',id},false)).status,403);
  assert.equal((await create(h)).status,200);assert.equal((await upload(h)).status,200);
  const active=await (await h.request('/api/consultations/active',undefined,false)).json();assert.equal(active.active.name,'Smith Kitchen');assert.equal(active.active.photos.length,1);
  assert.equal((await h.request('/api/consultations/media/'+id+'/'+photo().id+'/original',undefined,false)).headers.get('content-type'),'image/webp');
  assert.equal((await h.request('/api/consultations/media/'+id+'/'+photo().id+'/original',undefined,false,'bad')).status,401);
  const unchanged=await (await h.request('/api/consultations/active?since='+encodeURIComponent(active.revision),undefined,false)).json();assert.equal(unchanged.unchanged,true);
  assert.equal((await h.request('/api/consultations',{action:'rename',consultationId:id,name:'Smith Exterior'},false)).status,403);
  await h.request('/api/consultations',{action:'rename',consultationId:id,name:'Smith Kitchen Follow-Up'});assert.equal((await (await h.request()).json()).consultations[0].name,'Smith Kitchen Follow-Up');assert.equal(h.renders,0);
});

test('the one-hour clear preserves originals and renders and representative reopening starts a fresh hour',async()=>{
  const h=consultationFixture();const first=await (await create(h)).json();await upload(h);
  const look={id:'look-0000000000000001',photoId:photo().id,design,createdAt:new Date().toISOString(),quality:'preview'};
  assert.equal((await h.request('/api/consultations',{action:'look',consultationId:id,look,image:fixtureImage,rawImage:fixtureImage},false)).status,200);
  h.advance(3_600_001);assert.deepEqual(await (await h.request('/api/consultations/active',undefined,false)).json(),{active:null});
  const path='/api/consultations/media/'+id+'/'+look.id+'/render';assert.equal((await h.request(path,undefined,false)).status,403);assert.equal((await h.request(path)).status,200);
  const archive=(await (await h.request()).json()).consultations[0];assert.equal(archive.photoCount,1);assert.equal(archive.renderCount,1);
  await create(h);assert.equal((await (await h.request('/api/consultations/active')).json()).active,null,'retrying a create never extends expiry');
  const reopened=await (await h.request('/api/consultations',{action:'activate',consultationId:id})).json();assert.ok(reopened.expiresAt>first.expiresAt);assert.equal(reopened.consultation.photos.length,1);assert.equal(reopened.consultation.looks.length,1);
  assert.equal((await h.request(path,undefined,false)).status,200);assert.equal(h.renders,0);
});

test('stable cabinet references sync and survive archive reopening with color and photo validation',async()=>{
  const h=consultationFixture();await create(h);await upload(h);
  const base={id:'cabinet-base-0000000001',photoId:photo().id,design,cabinetReferenceId:'cabinet-base-0000000001',quality:'preview'};
  const variant={...base,id:'cabinet-variant-000000001',design:{...design,hardwareFinish:'gold',countertop:'calacatta',backsplash:'match-countertop'}};
  for(const look of [base,variant])assert.equal((await h.request('/api/consultations',{action:'look',consultationId:id,look,image:fixtureImage})).status,200);
  const active=await h.request('/api/consultations/active',undefined,false).then(r=>r.json());assert.equal(active.active.looks[1].cabinetReferenceId,base.id);
  const wrong={...variant,id:'bad-cabinet-00000000001',design:{...design,surfaces:{cabinets:'sw-6258'}}};assert.equal((await h.request('/api/consultations',{action:'look',consultationId:id,look:wrong,image:fixtureImage})).status,400);
  h.advance(3_600_001);const reopened=await h.request('/api/consultations',{action:'activate',consultationId:id}).then(r=>r.json());assert.equal(reopened.consultation.looks[1].cabinetReferenceId,base.id);assert.equal(reopened.consultation.looks[1].design.countertop,'calacatta');assert.equal(reopened.consultation.looks[1].design.backsplash,'match-countertop');
});

test('shutter colors and removal choices sync and survive archive reopening',async()=>{
  const h=consultationFixture();await create(h);const p=photo(0,'exterior');await upload(h,p);
  for(const [index,finish]of [{mode:'exterior',surfaces:{shutters:'sw-7008'},shutterAction:'keep'},{mode:'exterior',surfaces:{},shutterAction:'remove'}].entries()) {
    const look={id:`shutter-look-000000000000${index}`,photoId:p.id,design:finish,quality:'preview',createdAt:new Date().toISOString()};
    assert.equal((await h.request('/api/consultations',{action:'look',consultationId:id,look,image:fixtureImage},false)).status,200);
  }
  const active=(await h.request('/api/consultations/active',undefined,false).then(r=>r.json())).active;
  assert.equal(active.looks[0].design.surfaces.shutters,'sw-7008');assert.equal(active.looks[1].design.shutterAction,'remove');
  h.advance(3_600_001);const reopened=await h.request('/api/consultations',{action:'activate',consultationId:id}).then(r=>r.json());
  assert.equal(reopened.consultation.looks[1].design.shutterAction,'remove');assert.equal(h.renders,0);
});

test('idempotent retry, separate photo limits and concurrent uploads keep consultation metadata consistent',async()=>{
  const h=consultationFixture();await create(h);await upload(h);const writes=h.writes;await upload(h);assert.equal(h.writes,writes);
  const results=await Promise.all([1,2,3,4].map(i=>upload(h,photo(i))));assert.equal(results.filter(r=>r.status===200).length,3);assert.equal(results.filter(r=>r.status===409).length,1);
  for(let i=0;i<4;i++)assert.equal((await upload(h,photo(i,'exterior'))).status,200);
  const active=(await (await h.request('/api/consultations/active')).json()).active;assert.equal(active.photos.length,8);
  assert.equal((await h.request('/api/consultations',{action:'photo',consultationId:id,photo:photo(1),image:'data:image/svg+xml;base64,AAAA'})).status,200,'existing immutable photo IDs are idempotent');
  assert.equal((await h.request('/api/consultations',{action:'photo',consultationId:id,photo:{...photo(7),mode:'invalid'},image:fixtureImage})).status,400);
});

test('failed storage writes never claim saved media; later retry preserves the same identifier',async()=>{
  const h=consultationFixture();await create(h);h.failUploads(true);assert.equal((await upload(h)).status,503);
  assert.equal((await (await h.request('/api/consultations/active')).json()).active.photos.length,0);
  h.failUploads(false);assert.equal((await upload(h)).status,200);assert.equal(h.objects.size,1);
  const missing={id:'look-0000000000000001',photoId:'missing-0000000000001',design};assert.equal((await h.request('/api/consultations',{action:'look',consultationId:id,look:missing,image:fixtureImage})).status,400);
  await h.request('/api/consultations',{action:'close',consultationId:id});assert.equal((await (await h.request('/api/consultations/active')).json()).active,null);
  await h.request('/api/consultations',{action:'delete',consultationId:id});assert.equal((await (await h.request()).json()).consultations.length,0);assert.equal(h.objects.size,0);
});

test('a draft uploaded after its hour is archived without replacing another active customer',async()=>{
  const h=consultationFixture();await create(h);const lateId='22222222-2222-4222-8222-222222222222';
  const response=await h.request('/api/consultations',{action:'create',id:lateId,name:'Offline Earlier Visit',expiresAt:Date.now()-1});assert.equal(response.status,200);
  assert.equal((await (await h.request('/api/consultations/active')).json()).active.id,id);assert.equal((await (await h.request()).json()).consultations.length,2);
  assert.equal((await h.request('/api/session',undefined,true,accessToken)).status,200);
});

test('the shared media budget fails without publishing or leaving unreferenced files',async()=>{
  const h=consultationFixture();await create(h);h.records.set('consultation:mediaBytes',2*1024*1024*1024);
  const result=await upload(h);assert.equal(result.status,409);assert.equal((await result.json()).error.code,'storage_limit');assert.equal(h.objects.size,0);
  assert.equal((await (await h.request('/api/consultations/active')).json()).active.photos.length,0);
  h.records.set('consultation:mediaBytes',0);await upload(h);assert.ok(h.records.get('consultation:mediaBytes')>0);
  await h.request('/api/consultations',{action:'delete',consultationId:id});assert.equal(h.records.get('consultation:mediaBytes'),0);
});
