import {ApiError} from './errors.mjs';
import {validateImage} from './images.mjs';
import {validateDesign} from './design.mjs';
import {sameCabinetColors} from '../src/lib/cabinetAppearance.js';

const HOUR=3_600_000;
const idPattern=/^[a-zA-Z0-9-]{16,80}$/;
const invalid=message=>{throw new ApiError(400,'invalid_consultation',message);};
const requireId=id=>{if(typeof id!=='string'||!idPattern.test(id))invalid('This consultation has an invalid identifier.');return id;};
const text=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const summary=c=>({id:c.id,name:c.name,createdAt:c.createdAt,updatedAt:c.updatedAt,photoCount:c.photos.length,renderCount:c.looks.length});
const assetKey=(id,item,kind)=>`consultations/${requireId(id)}/${requireId(item)}/${kind}`;
const operatorOnly=operator=>{if(!operator)throw new ApiError(403,'operator_required','Open consultation tools with representative access.');};

export class ConsultationStore {
  constructor({storage,bucket,catalog,now=()=>Date.now()}) {Object.assign(this,{storage,bucket,catalog,now});this.tail=Promise.resolve();}
  serial(operation) {const result=this.tail.then(operation);this.tail=result.catch(()=>{});return result;}
  async record(id) {const record=await this.storage.get(`consultation:${requireId(id)}`);if(!record)throw new ApiError(404,'consultation_not_found','This consultation could not be found.');return record;}
  async active() {
    const pointer=await this.storage.get('consultation:active');
    return pointer && pointer.expiresAt>this.now()?pointer:null;
  }
  async access(id,operator) {const active=await this.active();if(!operator && active?.id!==id)throw new ApiError(403,'consultation_closed','This customer session has ended. Your representative can reopen the saved consultation.');return this.record(id);}
  async commit(c,mediaBytes=0) {
    c.revision+=1;c.updatedAt=new Date(this.now()).toISOString();
    if(Buffer.byteLength(JSON.stringify(c))>1_700_000)throw new ApiError(409,'consultation_limit','This consultation is full. Start another named consultation for more previews.');
    await this.storage.transaction(async tx=>{
      const usage=(await tx.get('consultation:mediaBytes')) || 0;
      if(usage+mediaBytes>2*1024*1024*1024)throw new ApiError(409,'storage_limit','Shared storage is full. Remove an older consultation before adding more images.');
      const index=(await tx.get('consultation:index')) || [];
      await tx.put(`consultation:${c.id}`,c);
      await tx.put('consultation:index',[summary(c),...index.filter(item=>item.id!==c.id)].slice(0,1000));
      if(mediaBytes)await tx.put('consultation:mediaBytes',usage+mediaBytes);
    });
    return c;
  }
  async handle(request,{operator,parseBody,json,headers}) {
    if(!this.bucket)throw new ApiError(503,'sync_unavailable','Consultation sync needs setup. Photos remain on this tablet.');
    const url=new URL(request.url);const path=url.pathname;
    if(request.method==='GET') {
      if(path==='/api/consultations') {operatorOnly(operator);return json({consultations:(await this.storage.get('consultation:index')) || []});}
      if(path==='/api/consultations/active') {
        const active=await this.active();if(!active)return json({active:null});
        const c=await this.record(active.id);const revision=`${c.id}:${c.revision}:${active.expiresAt}`;
        if(url.searchParams.get('since')===revision)return json({unchanged:true,revision,expiresAt:active.expiresAt});
        return json({active:{...c,expiresAt:active.expiresAt},revision});
      }
      const match=/^\/api\/consultations\/media\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9-]+)\/(original|render|raw)$/.exec(path);
      if(match) {
        const [,id,item,kind]=match;const c=await this.access(id,operator);
        if(!(kind==='original'?c.photos:c.looks).some(record=>record.id===item))throw new ApiError(404,'media_not_found','This photo is not saved in the consultation.');
        const object=await this.bucket.get(assetKey(id,item,kind));
        if(!object)throw new ApiError(404,'media_not_found','This photo is not available yet.');
        return new Response(object.body,{headers:{...headers,'Content-Type':object.httpMetadata?.contentType || 'image/webp','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'",'Content-Disposition':'inline'}});
      }
      throw new ApiError(404,'not_found','This consultation page was not found.');
    }
    const body=await parseBody(request,17*1024*1024);
    if(!body || Array.isArray(body) || typeof body.action!=='string')invalid('Choose a consultation action.');
    return this.serial(async()=>{
      if(['create','activate','rename','close','delete'].includes(body.action))operatorOnly(operator);
      if(body.action==='create') {
        const id=requireId(body.id);let c=await this.storage.get(`consultation:${id}`);
        if(!c) {
          if(body.expiresAt!==undefined && (!Number.isSafeInteger(body.expiresAt)||body.expiresAt<0))invalid('This consultation has an invalid expiry.');
          const expiresAt=Math.min(body.expiresAt ?? this.now()+HOUR,this.now()+HOUR);
          c={id,name:text(body.name,160)||`Consultation ${new Date(this.now()).toLocaleDateString('en-US')}`,createdAt:new Date(this.now()).toISOString(),updatedAt:new Date(this.now()).toISOString(),initialExpiresAt:expiresAt,revision:1,photos:[],looks:[]};
          await this.storage.transaction(async tx=>{
            const index=(await tx.get('consultation:index')) || [];
            if(index.length>=1000)throw new ApiError(409,'consultation_limit','The consultation library is full. Remove an older consultation before adding another.');
            await tx.put(`consultation:${id}`,c);await tx.put('consultation:index',[summary(c),...index]);
            if(expiresAt>this.now())await tx.put('consultation:active',{id,expiresAt});
          });
        }
        const pointer=await this.storage.get('consultation:active');
        return json({consultation:c,expiresAt:pointer?.id===id?pointer.expiresAt:c.initialExpiresAt});
      }
      const id=requireId(body.consultationId);
      if(body.action==='activate') {const c=await this.record(id);const expiresAt=this.now()+HOUR;await this.storage.put('consultation:active',{id,expiresAt});return json({consultation:c,expiresAt});}
      if(body.action==='rename') {const c=await this.record(id);c.name=text(body.name,160);if(!c.name)invalid('Enter a consultation name.');return json({consultation:await this.commit(c)});}
      if(body.action==='close') {const pointer=await this.active();if(pointer?.id===id)await this.storage.delete('consultation:active');return json({closed:true});}
      if(body.action==='delete') {
        const c=await this.record(id);const keys=[...c.photos.map(p=>assetKey(id,p.id,'original')),...c.looks.flatMap(r=>[assetKey(id,r.id,'render'),assetKey(id,r.id,'raw')])];
        for(let i=0;i<keys.length;i+=100)await this.bucket.delete(keys.slice(i,i+100));
        await this.storage.transaction(async tx=>{await tx.delete(`consultation:${id}`);await tx.put('consultation:index',((await tx.get('consultation:index')) || []).filter(c=>c.id!==id));await tx.put('consultation:mediaBytes',Math.max(0,((await tx.get('consultation:mediaBytes')) || 0)-[...c.photos,...c.looks].reduce((sum,r)=>sum+(r.bytes || 0),0)));const pointer=await tx.get('consultation:active');if(pointer?.id===id)await tx.delete('consultation:active');});
        return json({deleted:true});
      }
      const c=await this.access(id,operator);
      if(body.action==='photo') {
        const p=body.photo;if(!p || !['kitchen','exterior'].includes(p.mode) || ![p.width,p.height].every(n=>Number.isInteger(n)&&n>0&&n<=4096))invalid('This photo could not be read.');requireId(p.id);
        if(c.photos.some(photo=>photo.id===p.id))return json({saved:true,revision:c.revision});
        if(c.photos.filter(photo=>photo.mode===p.mode).length>=4)throw new ApiError(409,'photo_limit','Each consultation allows four kitchen and four exterior photos.');
        const image=validateImage(body.image);const bytes=Buffer.from(image.split(',')[1],'base64');
        await this.bucket.put(assetKey(id,p.id,'original'),bytes,{httpMetadata:{contentType:image.slice(5,image.indexOf(';'))}});
        c.photos.push({id:p.id,mode:p.mode,name:text(p.name,160),width:p.width,height:p.height,bytes:bytes.length,createdAt:new Date(this.now()).toISOString()});
        try{await this.commit(c,bytes.length);}catch(error){await this.bucket.delete(assetKey(id,p.id,'original')).catch(()=>{});throw error;}return json({saved:true,revision:c.revision});
      }
      if(body.action==='look') {
        const r=body.look;if(!r || !c.photos.some(p=>p.id===r.photoId && p.mode===r.design?.mode))invalid('Save the original photo before saving this preview.');requireId(r.id);
        if(c.looks.some(look=>look.id===r.id))return json({saved:true,revision:c.revision});
        if(c.looks.length>=120)throw new ApiError(409,'look_limit','This consultation has reached 120 previews. Start a new consultation for more.');
        const design=structuredClone(r.design);const customPrompt=design.customPrompt;delete design.customPrompt;
        if(r.cabinetReferenceId!==undefined){requireId(r.cabinetReferenceId);if(design.mode!=='kitchen' || (r.cabinetReferenceId!==r.id && !c.looks.some(base=>base.id===r.cabinetReferenceId && base.photoId===r.photoId && sameCabinetColors(base.design,design))))invalid('Save a matching cabinet reference before saving this preview.');}
        const checked=validateDesign({image:body.image,design,quality:r.quality || 'preview',...(customPrompt?{customPrompt}:{}),...(r.corrections?.length?{corrections:r.corrections}:{}),...(r.regions?.length?{regions:r.regions}:{})},this.catalog);
        if((checked.customPrompt || checked.corrections.length || checked.quality==='detail')&&!operator)operatorOnly(operator);
        const image=validateImage(body.image);const raw=validateImage(body.rawImage || body.image);
        let bytes=0;
        try{
          for(const [kind,data]of [['render',image],['raw',raw]]){const binary=Buffer.from(data.split(',')[1],'base64');bytes+=binary.length;await this.bucket.put(assetKey(id,r.id,kind),binary,{httpMetadata:{contentType:data.slice(5,data.indexOf(';'))}});}
          c.looks.push({id:r.id,photoId:r.photoId,...(r.cabinetReferenceId?{cabinetReferenceId:r.cabinetReferenceId}:{}),design:{...design,...(checked.customPrompt?{customPrompt:checked.customPrompt}:{})},corrections:checked.corrections,regions:checked.regions,createdAt:Number.isNaN(Date.parse(r.createdAt))?new Date(this.now()).toISOString():new Date(r.createdAt).toISOString(),quality:checked.quality,model:text(r.model,100),bytes});
          await this.commit(c,bytes);
        }catch(error){await this.bucket.delete([assetKey(id,r.id,'render'),assetKey(id,r.id,'raw')]).catch(()=>{});throw error;}
        return json({saved:true,revision:c.revision});
      }
      invalid('This consultation action is not supported.');
    });
  }
}
