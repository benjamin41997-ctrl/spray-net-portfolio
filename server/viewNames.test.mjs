import test from 'node:test';
import assert from 'node:assert/strict';
import {createApi} from './api.mjs';
import {loadConfig} from './config.mjs';
import {fixtureImage} from '../tests/consultation-fixture.mjs';
import {renderName,renderDetails,renderFilename} from '../src/lib/renderNames.js';

const token='view-test-token-'.padEnd(43,'a'),origin='https://portfolio.example.com';
const config=loadConfig({OPENAI_API_KEY:'server-only',VISUALIZER_ACCESS_TOKEN:token,VISUALIZER_ALLOWED_ORIGINS:origin});
const body={mode:'kitchen',photos:[{id:'first-angle',image:fixtureImage},{id:'second-angle',image:fixtureImage}]};
const request=(data=body,access=token)=>new Request('https://api.example.com/api/view-labels',{method:'POST',headers:{Origin:origin,Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:JSON.stringify(data)});

test('view names use one bounded low-detail request, strict labels and a separate analysis allowance',async()=>{
  let render=0,analysis=0,calls=0,sent;
  const api=createApi({config,catalog:[],reserve:()=>render++,reserveAnalysis:()=>analysis++,fetchImpl:async(url,init)=>{
    calls++;assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(init.redirect,'manual');sent=JSON.parse(init.body);
    return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({photos:[{photoId:'second-angle',landmarks:['fridge']},{photoId:'first-angle',landmarks:['sink','dishwasher']}]})}]}]}));
  }});
  assert.equal((await api(request(body,'wrong'))).status,401);assert.equal(calls,0);
  const response=await api(request());assert.equal(response.status,200);assert.equal(render,0);assert.equal(analysis,1);assert.equal(calls,1);
  assert.equal(sent.model,'gpt-6-luna');assert.equal(sent.store,false);assert.equal(sent.text.format.strict,true);assert.ok(sent.input[0].content.filter(c=>c.type==='input_image').every(c=>c.detail==='low'));
  assert.deepEqual((await response.json()).photos,[{id:'second-angle',viewLabel:'Fridge View'},{id:'first-angle',viewLabel:'Sink & Dishwasher View'}]);
  for(const invalid of [{...body,photos:Array(5).fill(body.photos[0])},{...body,photos:[{...body.photos[0],image:'x'.repeat(350001)}]},{...body,customPrompt:'arbitrary'}])assert.equal((await api(request(invalid))).status,400);
  assert.equal(calls,1);
});

test('invalid or refused view recognition is never retried or mistaken for a valid landmark',async()=>{
  for(const photos of [[{photoId:'first-angle',landmarks:['garage']},{photoId:'second-angle',landmarks:[]}],[{photoId:'first-angle',landmarks:[]},{photoId:'first-angle',landmarks:[]}],[]]){
    let calls=0;const api=createApi({config,catalog:[],reserve:()=>{},fetchImpl:async()=>{calls++;return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({photos})}]}]}));}});
    const r=await api(request());assert.equal(r.status,502);assert.equal((await r.json()).error.code,'view_labels_failed');assert.equal(calls,1);
  }
});

test('render names identify verified colors and views, include finish details and use descriptive attachment filenames',()=>{
  const record={id:'abcdef12-1234',viewLabel:'Sink & Dishwasher View',design:{mode:'kitchen',surfaces:{cabinets:'sw-7008'},hardwareStyle:'small-handle',hardwareFinish:'copper',countertop:'calacatta',backsplash:'match-countertop'}};
  assert.equal(renderName(record),'Alabaster · Sink & Dishwasher View');assert.match(renderDetails(record),/Copper Small Handles/);assert.match(renderDetails(record),/Calacatta Countertops/);
  assert.equal(renderName(record,{viewLabel:'Island View'}),'Alabaster · Island View');assert.match(renderFilename(record),/^spray-net-alabaster-sink-dishwasher-view-abcdef12$/);
  assert.equal(renderName({design:{mode:'exterior',surfaces:{}}}),'Existing Colors · Exterior Overview');
  assert.match(renderName({...record,design:{mode:'kitchen',surfaces:{},customPrompt:'Use SW 7008.'}}),/^Alabaster/);
});
