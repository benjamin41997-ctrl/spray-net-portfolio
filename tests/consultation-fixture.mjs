import {ConsultationStore} from '../server/consultations.mjs';
import {createApi} from '../server/api.mjs';
import {loadConfig} from '../server/config.mjs';
import {colors} from '../src/data/colors.js';

export const accessToken='consultation-test-tablet-'.padEnd(43,'a');
export const operatorToken='consultation-test-operator-'.padEnd(43,'b');
export const fixtureImage='data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
export function consultationFixture({origin='https://portfolio.example.com',renderImage=fixtureImage}={}) {
  const records=new Map();const objects=new Map();let offset=0;let writes=0;let renders=0;let failUploads=false;
  const storage={get:async key=>structuredClone(records.get(key)),put:async(key,value)=>{records.set(key,structuredClone(value));},delete:async key=>records.delete(key),transaction:async fn=>fn(storage)};
  const bucket={put:async(key,value,options)=>{if(failUploads)throw new Error('Test storage failure');objects.set(key,{bytes:new Uint8Array(value),type:options.httpMetadata.contentType});writes++;},get:async key=>{const o=objects.get(key);return o?{body:o.bytes,httpMetadata:{contentType:o.type}}:null;},delete:async keys=>{for(const key of Array.isArray(keys)?keys:[keys])objects.delete(key);}};
  const config=loadConfig({OPENAI_API_KEY:'test-key',VISUALIZER_ACCESS_TOKEN:accessToken,VISUALIZER_OPERATOR_TOKEN:operatorToken,VISUALIZER_ALLOWED_ORIGINS:origin});
  const consultations=new ConsultationStore({storage,bucket,catalog:colors,now:()=>Date.now()+offset});
  const api=createApi({config,catalog:colors,consultations,reserve:()=>{},reserveAnalysis:()=>{},fetchImpl:async()=>{renders++;return new Response(JSON.stringify({data:[{b64_json:renderImage.split(',')[1]}]}));}});
  const request=(path='/api/consultations',body,operator=true,token=accessToken)=>api(new Request('https://api.example.com'+path,{method:body?'POST':'GET',headers:{Origin:origin,Authorization:`Bearer ${token}`,...(operator?{'X-Visualizer-Operator':operatorToken}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}));
  return {api,request,records,objects,advance:ms=>{offset+=ms;},failUploads:value=>{failUploads=value;},get writes(){return writes;},get renders(){return renders;}};
}
