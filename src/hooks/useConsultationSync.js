import {useEffect,useRef,useState} from 'react';
import {callVisualizer,connectionSettings,normalizeEndpoint} from '../lib/visualizerClient';
import {cacheGet,cachePut,cacheDelete,cacheMedia,cachedMedia,blobDataUrl,queuedTasks,queueTask,removeTask,mediaPath} from '../lib/consultationCache';
import {withoutRender} from '../lib/renderCollection';

const defaultName=()=>`Consultation ${new Date().toLocaleString()}`;
const metaPhoto=({id,mode,name,width,height})=>({id,mode,name,width,height});
const metaLook=({id,photoId,design,cabinetReferenceId,corrections=[],regions=[],createdAt,quality,model})=>({id,photoId,design,...(cabinetReferenceId?{cabinetReferenceId}:{}),corrections,regions,createdAt,quality:quality || 'preview',model});
export default function useConsultationSync({snapshot,onRemote,onClear}) {
  const [enabled,setEnabled]=useState(false);const [session,setSession]=useState(null);const [status,setStatus]=useState('');const [pending,setPending]=useState(0);
  const state=useRef({enabled:false,session:null,revision:'',pumping:false,polling:false,epoch:0,prepare:null,online:navigator.onLine});
  const callbacks=useRef({snapshot,onRemote,onClear});callbacks.current={snapshot,onRemote,onClear};
  const settledStatus=()=>state.current.localError?`Not Synced: ${state.current.localError}`:'Synced to Shared Consultation';
  const api=(path,body)=>callVisualizer(path,{...connectionSettings(),body,signal:AbortSignal.timeout(60_000)});
  const setCurrent=async next=>{state.current.session=next;setSession(next);if(next)await cachePut('active',next);else await cacheDelete('active');};
  async function clearCurrent(home=true) {
    state.current.epoch++;state.current.revision='';
    try{await setCurrent(null);}catch{setStatus('Session Cleared - Local Storage Needs Attention');}
    finally{callbacks.current.onClear(home);}
  }
  async function media(id,item,kind) {
    const key=mediaPath(id,item,kind);const cached=await cachedMedia(key);if(cached)return cached;
    const c=connectionSettings();const response=await fetch(`${normalizeEndpoint(c.endpoint)}/api/consultations/media/${key}`,{cache:'no-store',credentials:'omit',headers:{Authorization:`Bearer ${c.token}`,...(c.operatorToken?{'X-Visualizer-Operator':c.operatorToken}:{})},signal:AbortSignal.timeout(60_000)});
    if(!response.ok)throw new Error('A consultation image has not finished syncing. We will try again.');
    const blob=await response.blob();if(!/^image\/(jpeg|png|webp)$/.test(blob.type))throw new Error('An image could not be read.');await cacheMedia(key,blob);return blob;
  }
  async function hydrate(c,revision='') {
    const generation=state.current.epoch;const current=state.current.session;
    const replacing=current?.id!==c.id;
    if(replacing && (current || callbacks.current.snapshot.allPhotos.length))callbacks.current.onClear(false);
    const local=callbacks.current.snapshot;
    const photos=[];const looks=[];
    for(const p of c.photos) {
      const existing=!replacing&&local.allPhotos.find(item=>item.id===p.id);
      if(existing){photos.push(existing);continue;}
      const blob=await media(c.id,p.id,'original');photos.push({...p,blob,dataUrl:await blobDataUrl(blob)});
    }
    for(const r of c.looks) {
      const existing=!replacing&&local.looks.find(item=>item.id===r.id);
      if(existing){looks.push({...existing,...r});continue;}
      const original=photos.find(p=>p.id===r.photoId);if(!original)continue;
      const [renderPhoto,rawRenderPhoto]=await Promise.all([media(c.id,r.id,'render'),media(c.id,r.id,'raw')]);
      looks.push({...r,originalPhoto:original.blob,renderPhoto,rawRenderPhoto,consultationId:c.id,consultationLabel:c.name,saved:true});
    }
    if(generation!==state.current.epoch)return;
    for(const id of c.deletedLookIds || [])await Promise.all(['render','raw'].map(kind=>cacheDelete(mediaPath(c.id,id,kind))));
    await cachePut('session:'+c.id,c);await setCurrent({id:c.id,name:c.name,expiresAt:c.expiresAt});state.current.revision=revision;
    callbacks.current.onRemote({id:c.id,name:c.name,photos,looks,deletedLookIds:c.deletedLookIds || [],replacing});
  }
  async function pump() {
    if(!state.current.enabled || !navigator.onLine || state.current.pumping)return;
    state.current.pumping=true;
    try {
      let tasks=await queuedTasks();setPending(tasks.length);
      while(tasks.length && navigator.onLine) {
        setStatus(`Syncing ${tasks.length} ${tasks.length===1?'item':'items'}...`);
        const task=tasks[0];
        try{await api('/api/consultations',task.body);}
        catch(error){if(error.code!=='look_deleted')throw error;state.current.revision='';}
        await removeTask(task.taskId);
        tasks=await queuedTasks();setPending(tasks.length);
      }
      setStatus(tasks.length?'Waiting for Internet':settledStatus());
    } catch(error){setStatus(`Not Synced: ${error.message}`);}
    finally{state.current.pumping=false;}
  }
  async function enqueue(body) {await queueTask({body});setPending((await queuedTasks()).length);setStatus(navigator.onLine?'Syncing...':'Saved Here - Waiting for Internet');void pump();}
  async function poll() {
    if(!state.current.enabled || !navigator.onLine || state.current.polling || state.current.pumping)return;
    state.current.polling=true;
    const generation=state.current.epoch,sessionAtStart=state.current.session?.id;
    try {
      const tasks=await queuedTasks();if(tasks.length){void pump();return;}
      const result=await api('/api/consultations/active?since='+encodeURIComponent(state.current.revision));
      if(generation!==state.current.epoch || sessionAtStart!==state.current.session?.id || (await queuedTasks()).length)return;
      if(result.unchanged)return;
      if(!result.active){if(state.current.session)await clearCurrent();return;}
      await hydrate(result.active,result.revision);setStatus(settledStatus());
    }catch(error){setStatus(`Sync Unavailable: ${error.message}`);}
    finally{state.current.polling=false;}
  }
  async function checkConnection() {
    const c=connectionSettings();if(!c.token){state.current.enabled=false;setEnabled(false);return false;}
    try {
      const data=await api('/api/session');state.current.enabled=Boolean(data.consultationsEnabled);state.current.operator=Boolean(data.operatorAuthorized);setEnabled(state.current.enabled);
      if(state.current.enabled){await cachePut('supported',true);void pump().then(poll);}
      return state.current.enabled;
    }catch{const supported=await cacheGet('supported').catch(()=>false);state.current.enabled=Boolean(supported);state.current.operator=Boolean(c.operatorToken);setEnabled(Boolean(supported));return Boolean(supported);}
  }
  async function prepare(name='') {
    if(state.current.prepare)return state.current.prepare;
    state.current.prepare=(async()=>{
      if(!state.current.enabled && !await checkConnection())return null;
      if(state.current.session?.expiresAt>Date.now())return state.current.session;
      if(navigator.onLine){const result=await api('/api/consultations/active');if(result.active){await hydrate(result.active,result.revision);return state.current.session;}}
      if(!state.current.operator)throw new Error('Ask your representative to start a shared consultation on their tablet.');
      const c={id:crypto.randomUUID(),name:name.trim() || defaultName(),expiresAt:Date.now()+3_600_000};
      await setCurrent(c);await cachePut('session:'+c.id,{...c,photos:[],looks:[]});await enqueue({action:'create',id:c.id,name:c.name,expiresAt:c.expiresAt});return c;
    })();
    try{return await state.current.prepare;}finally{state.current.prepare=null;}
  }
  async function savePhotos(c,photos) {
    if(!c)return;
    try{
    for(const p of photos){await cacheMedia(mediaPath(c.id,p.id,'original'),p.blob);await enqueue({action:'photo',consultationId:c.id,photo:metaPhoto(p),image:p.dataUrl});}
    const saved=(await cacheGet('session:'+c.id)) || {...c,photos:[],looks:[]};
    saved.photos=[...saved.photos,...photos.map(metaPhoto).filter(p=>!saved.photos.some(item=>item.id===p.id))];await cachePut('session:'+c.id,saved);
    state.current.localError='';
    }catch(error){state.current.localError=error.message;setStatus(settledStatus());throw error;}
  }
  async function saveLook(c,look) {
    if(!c)return;
    try{
    const raw=look.rawRenderPhoto || look.renderPhoto;
    await Promise.all([cacheMedia(mediaPath(c.id,look.id,'render'),look.renderPhoto),cacheMedia(mediaPath(c.id,look.id,'raw'),raw)]);
    await enqueue({action:'look',consultationId:c.id,look:metaLook(look),image:await blobDataUrl(look.renderPhoto),rawImage:await blobDataUrl(raw)});
    const saved=(await cacheGet('session:'+c.id)) || {...c,photos:[],looks:[]};saved.looks=[...saved.looks.filter(r=>r.id!==look.id),metaLook(look)];await cachePut('session:'+c.id,saved);
    state.current.localError='';
    }catch(error){state.current.localError=error.message;setStatus(settledStatus());throw error;}
  }
  async function startNew(name) {setStatus('Starting Consultation...');await clearCurrent(false);return prepareNew(name);}
  async function prepareNew(name) {
    if(!state.current.enabled && !await checkConnection())return null;
    if(!state.current.operator)throw new Error('Activate representative access with your tablet password before starting a consultation.');
    const c={id:crypto.randomUUID(),name:name.trim() || defaultName(),expiresAt:Date.now()+3_600_000};await setCurrent(c);await cachePut('session:'+c.id,{...c,photos:[],looks:[]});await enqueue({action:'create',id:c.id,name:c.name,expiresAt:c.expiresAt});return c;
  }
  async function rename(name) {
    const c=state.current.session || await prepare(name);if(!c)return;
    const next={...c,name:name.trim() || defaultName()};await setCurrent(next);const saved=await cacheGet('session:'+c.id);if(saved)await cachePut('session:'+c.id,{...saved,name:next.name});await enqueue({action:'rename',consultationId:c.id,name:next.name});
  }
  async function list() {
    if(!navigator.onLine)return (await cacheGet('library')) || [];
    const data=await api('/api/consultations');await cachePut('library',data.consultations);return data.consultations;
  }
  async function activate(id) {
    if((await queuedTasks()).length)throw new Error('Wait for the current photos to finish syncing before reopening another consultation.');
    state.current.epoch++;const result=await api('/api/consultations',{action:'activate',consultationId:id});await hydrate({...result.consultation,expiresAt:result.expiresAt});void poll();
  }
  async function end() {const c=state.current.session;if(c)await api('/api/consultations',{action:'close',consultationId:c.id});await clearCurrent();}
  async function remove(id) {if((await queuedTasks()).some(task=>(task.body.consultationId || task.body.id)===id))throw new Error('Finish syncing this consultation before deleting it.');await api('/api/consultations',{action:'delete',consultationId:id});if(state.current.session?.id===id)await clearCurrent();await cacheDelete('session:'+id);}
  async function removeLook(look) {
    if(!navigator.onLine)throw new Error('Connect to the internet to delete this shared preview from both tablets.');
    if((await queuedTasks()).some(task=>(task.body.consultationId || task.body.id)===look.consultationId))throw new Error('Let this consultation finish syncing before deleting a preview.');
    state.current.epoch++;state.current.revision='';
    let result;
    try{result=await api('/api/consultations',{action:'deleteLook',consultationId:look.consultationId,lookId:look.id});}
    catch(error){
      if(!['consultation_not_found','look_not_found'].includes(error.code))throw error;
      // An older local copy can outlive a consultation deleted from another tablet.
      const saved=await cacheGet('session:'+look.consultationId);
      if(saved)await cachePut('session:'+look.consultationId,{...saved,looks:withoutRender(saved.looks,look.id),deletedLookIds:[...new Set([...(saved.deletedLookIds || []),look.id])]});
    }
    for(const kind of ['render','raw'])await cacheDelete(mediaPath(look.consultationId,look.id,kind));
    if(result){
      if(state.current.session?.id===look.consultationId)await hydrate({...result.consultation,expiresAt:state.current.session.expiresAt});
      else await cachePut('session:'+look.consultationId,result.consultation);
    }
  }
  useEffect(()=>{
    let alive=true;
    (async()=>{
      const c=await cacheGet('active').catch(()=>null);if(!alive)return;
      if(c?.expiresAt>Date.now()){const saved=await cacheGet('session:'+c.id);if(saved)try{await hydrate({...saved,expiresAt:c.expiresAt});}catch{/* Online poll will restore missing media. */}}
      else if(c){await cacheDelete('active');}
      if(alive)await checkConnection();
    })();
    const tick=()=>{if(state.current.session?.expiresAt<=Date.now())void clearCurrent();if(document.visibilityState==='visible')void pump().then(poll);};
    const reconnect=()=>{void checkConnection();tick();};
    const disconnect=()=>setStatus('Offline - Changes Saved Here');
    const timer=setInterval(tick,5000);
    window.addEventListener('online',reconnect);window.addEventListener('offline',disconnect);window.addEventListener('visualizer-connection-changed',reconnect);document.addEventListener('visibilitychange',tick);
    return()=>{alive=false;clearInterval(timer);window.removeEventListener('online',reconnect);window.removeEventListener('offline',disconnect);window.removeEventListener('visualizer-connection-changed',reconnect);document.removeEventListener('visibilitychange',tick);};
  },[]);
  return {enabled,session,status:!navigator.onLine&&enabled?'Offline - Changes Saved Here':status,pending,prepare,savePhotos,saveLook,startNew,rename,list,activate,end,remove,removeLook,retry:async()=>{if(state.current.localError && state.current.session){await savePhotos(state.current.session,callbacks.current.snapshot.allPhotos);for(const look of callbacks.current.snapshot.looks)await saveLook(state.current.session,look);}await pump();await poll();}};
}
