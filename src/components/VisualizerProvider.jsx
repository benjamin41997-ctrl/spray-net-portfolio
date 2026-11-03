import useConsultationSync from '../hooks/useConsultationSync';
import {navigate} from '../lib/navigation';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { callVisualizer, connectionSettings, imageDataBlob } from '../lib/visualizerClient';
import {withoutRender} from '../lib/renderCollection';
import { saveRender, deleteRender, updateSavedView } from '../lib/visualizerStorage';
import {findCabinetReference} from '../lib/cabinetAppearance';
import {photoViewThumbnail} from '../lib/visualizerPhoto';
import {photoViewLabel} from '../lib/photoViews';
import {blobDataUrl} from '../lib/consultationCache';

const Context = createContext(null);
export const useVisualizer = () => useContext(Context);
export const newDesign = (mode = 'kitchen') => ({ mode, sidingMaterial: 'auto', ...(mode==='exterior'?{shutterAction:'keep'}:{}), surfaces: {}, hardwareStyle: 'keep', hardwareFinish: 'keep', backsplash: 'keep', countertop: 'keep' });
export default function VisualizerProvider({ children }) {
  const [advancedMode,setAdvancedMode]=useState(false);
  const [allPhotos,setPhotos]=useState([]);
  const [mode,setMode]=useState('kitchen');
  const [photoIds,setPhotoIds]=useState({kitchen:null,exterior:null});
  const [designs,setDesigns]=useState(()=>({kitchen:newDesign('kitchen'),exterior:newDesign('exterior')}));
  const design=designs[mode];
  const setDesign=next=>setDesigns(current=>({...current,[mode]:typeof next==='function'?next(current[mode]):next}));
  const photos=allPhotos.filter(item=>item.mode===mode);
  const photoId=photoIds[mode];
  const photo=photos.find(item=>item.id===photoId) || null;
  const [looks, setLooks] = useState([]);
  const [selectedIds,setSelectedIds]=useState({});
  const selectedId=selectedIds[photoId] || looks.find(item=>item.photoId===photoId)?.id || null;
  const setSelectedId=id=>setSelectedIds(current=>({...current,[photoId]:id}));
  const [label, setLabel] = useState('');
  const [batch,setBatch]=useState(null);const batchPlan=useRef(null);const lastRenderStartedAt=useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [analyses,setAnalyses]=useState({});
  const analysisCache=useRef({}); const analysisController=useRef(null); const analysisTask=useRef(null);const analysisTasks=useRef({});
  const selection=useRef({photoId,mode:design.mode});selection.current={photoId,mode:design.mode};
  const correctionsByPhoto=useRef({});
  const syncRef=useRef(null);
  const controller = useRef(null);
  const epoch = useRef(0);
  const reset = () => {
    setAdvancedMode(false);setBatch(null);batchPlan.current=null;
    epoch.current += 1; controller.current?.abort(); controller.current = null; analysisController.current?.abort(); analysisCache.current={}; analysisTasks.current={};analysisTask.current=null; correctionsByPhoto.current={}; setAnalyses({});
    setPhotos([]); setPhotoIds({kitchen:null,exterior:null});setMode('kitchen');setDesigns({kitchen:newDesign('kitchen'),exterior:newDesign('exterior')});setLooks([]);setSelectedIds({}); setLabel(''); setBusy(false); setError(''); setSaveWarning('');
  };
  useEffect(() => {
    window.addEventListener('portfolio-session-reset', reset);
    return () => { window.removeEventListener('portfolio-session-reset', reset); controller.current?.abort(); analysisController.current?.abort(); };
  }, []);
  const addPhotos = async (next) => {
    if (controller.current || !next.length) return;
    if(photos.length+next.length>4){setError('Add up to 4 photos for each project type.');return;}
    const consultation=await syncRef.current.prepare(label);
    const generation=epoch.current;
    const added = next.map(item => ({ ...item, mode, viewLabel:photoViewLabel(mode), id:crypto.randomUUID() }));
    setError(''); setSaveWarning('');
    if(navigator.onLine && connectionSettings().token){
      try{
        const inputs=await Promise.all(added.map(async p=>({id:p.id,image:await photoViewThumbnail(p.blob)})));
        const result=await callVisualizer('/api/view-labels',{...connectionSettings(),signal:AbortSignal.timeout(30_000),body:{mode,photos:inputs}});
        for(const p of added){const label=result.photos?.find(r=>r.id===p.id)?.viewLabel;if(typeof label==='string' && label.trim())p.viewLabel=label.trim().slice(0,60);}
      }catch{/* Photos remain usable; representatives can name views in Advanced Mode. */}
    }
    if(epoch.current!==generation)return;
    try{await syncRef.current.savePhotos(consultation,added);}catch(e){setSaveWarning('Photos are on this tablet but not synced: '+e.message);}
    if(epoch.current!==generation)return;
    setPhotos(current => [...current, ...added.filter(p=>!current.some(item=>item.id===p.id))]);
    if (!photoId) setPhotoIds(current=>({...current,[mode]:current[mode] || added[0].id}));
  };
  const selectPhoto = (id) => {
    if (controller.current) return;
    if(!photos.some(item=>item.id===id))return;
    setPhotoIds(current=>({...current,[mode]:id})); setError(''); setSaveWarning('');
  };
  function switchMode(next){if(!controller.current && ['kitchen','exterior'].includes(next)){setMode(next);setError('');setSaveWarning('');}}
  function analyzePhoto(mode, retry=false, feedback='') {
    if(mode!=='exterior' || !photo || controller.current)return;
    const key=`${photo.id}:${mode}`;
    if(!retry && analysisCache.current[key] && analysisCache.current[key].status!=='interrupted')return analysisTasks.current[key];
    const previousTask=analysisTask.current?.promise;
    const abort=new AbortController(); const generation=epoch.current;const requestId=crypto.randomUUID();
    if(feedback)correctionsByPhoto.current[key]=[...(correctionsByPhoto.current[key] || []),feedback.trim()].slice(-5);
    analysisCache.current[key]={...analysisCache.current[key],status:'loading',requestId};setAnalyses({...analysisCache.current});
    const promise=(async()=>{
      if(previousTask)await previousTask;
      if(epoch.current!==generation || selection.current.photoId!==photo.id || selection.current.mode!==mode)return {status:'interrupted'};
      analysisController.current=abort;
      return callVisualizer('/api/analyze',{...connectionSettings(),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(65_000)]),body:{image:photo.dataUrl,mode,imageSize:{width:photo.width,height:photo.height},...(feedback?{feedback,previousRegions:analysisCache.current[key]?.regions || []}:{})}});
    })()
      .then(data=>{if(data.status==='interrupted')return data;if(!Array.isArray(data.regions))throw new Error('Surface detection is unavailable.');return {status:'ready',regions:data.regions};})
      .catch(e=>({status:'error',message:e.message}))
      .then(result=>{if(epoch.current===generation && analysisCache.current[key]?.requestId===requestId){analysisCache.current[key]=abort.signal.aborted?{status:'interrupted'}:result;setAnalyses({...analysisCache.current});} return result;});
    analysisTask.current={key,promise};analysisTasks.current[key]=promise;return promise;
  }
  async function renderPhoto({photo,design,quality,customPrompt='',correction=null,availableSurfaces=null,consultation,generation,abort}) {
      const chosenDesign=correction?.record.design || design;
      const submittedDesign = { ...chosenDesign, surfaces: Object.fromEntries(Object.entries(chosenDesign.surfaces).filter(([, value]) => value)) };
      if(submittedDesign.mode==='exterior' && Array.isArray(availableSurfaces)) {
        submittedDesign.surfaces=Object.fromEntries(Object.entries(submittedDesign.surfaces).filter(([key])=>availableSurfaces.includes(key)));
        if(!availableSurfaces.includes('shutters'))submittedDesign.shutterAction='keep';
      }
      delete submittedDesign.customPrompt;
      const manual = (customPrompt || correction?.record.design.customPrompt || '').trim();
      const cabinetReference=!manual && !correction?findCabinetReference(looks,photo.id,submittedDesign,selectedIds[photo.id]):null;
      let appearanceReference;
      if(cabinetReference){const {customPrompt:unused,...referenceDesign}=cabinetReference.design;appearanceReference={image:await blobDataUrl(cabinetReference.rawRenderPhoto),design:referenceDesign};}
      const key=`${photo.id}:${submittedDesign.mode}`;
      if(analysisTasks.current[key] && analysisCache.current[key]?.status==='loading')await Promise.race([analysisTasks.current[key],new Promise(resolve=>abort.signal.addEventListener('abort',resolve,{once:true}))]);
      if(abort.signal.aborted || epoch.current!==generation)throw new DOMException('Rendering stopped.','AbortError');
      const regions=submittedDesign.mode==='exterior'?(analysisCache.current[key]?.regions || []):[];
      const previousNotes=[...new Set([...(correction?.record.corrections || []),...(correctionsByPhoto.current[key] || [])])].slice(-5);
      const corrections=correction?[...previousNotes,correction.feedback.trim()].slice(-5):previousNotes;
      let revision;
      if(correction) {
        const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Unable to read the previous preview.'));reader.readAsDataURL(correction.record.rawRenderPhoto || correction.record.renderPhoto);});
        revision={image,feedback:correction.feedback.trim()};
      }
      if(abort.signal.aborted || epoch.current!==generation)throw new DOMException('Rendering stopped.','AbortError');
      const wait=Math.max(0,5250-(Date.now()-lastRenderStartedAt.current));
      if(wait)await new Promise((resolve,reject)=>{
        const stop=()=>{clearTimeout(timer);reject(new DOMException('Rendering stopped.','AbortError'));};
        const timer=setTimeout(()=>{abort.signal.removeEventListener('abort',stop);resolve();},wait);
        abort.signal.addEventListener('abort',stop,{once:true});if(abort.signal.aborted)stop();
      });
      abort.signal.throwIfAborted();lastRenderStartedAt.current=Date.now();
      const data = await callVisualizer('/api/render', { ...connectionSettings(), signal: abort.signal, body: { image: photo.dataUrl, design: submittedDesign, quality, ...(appearanceReference?{appearanceReference}:{}), ...(regions.length?{regions}:{}), ...(corrections.length?{corrections}:{}), ...(revision?{correction:revision}:{}), ...(manual ? {customPrompt:manual} : {}) } });
      const {labelRender}=await import('../lib/renderLabel');
      const finalDesign=structuredClone({...submittedDesign,...(manual?{customPrompt:manual}:{})});
      const rawRenderPhoto=imageDataBlob(data.image);
      const renderPhoto = await labelRender(rawRenderPhoto,finalDesign);
      if (epoch.current !== generation) return;
      const id=crypto.randomUUID();
      const record = { id, ...(submittedDesign.mode==='kitchen' && !manual?{cabinetReferenceId:cabinetReference?.id || id}:{}), consultationId:consultation?.id, photoId:photo.id, viewLabel:photo.viewLabel, originalPhoto: photo.blob, renderPhoto, rawRenderPhoto, corrections, regions, design: structuredClone({...submittedDesign,...(manual ? {customPrompt:manual} : {})}), consultationLabel: label.trim() || `Consultation ${new Date().toLocaleString()}`, createdAt: new Date().toISOString(), model: data.model, quality };
      let saved = false;
      try { await saveRender(record); saved = true; }
      catch (e) { if (epoch.current === generation) setSaveWarning(e.message || 'This preview could not be saved on this tablet. Use Save Image before leaving.'); }
      if (epoch.current !== generation) return;
      try{await syncRef.current.saveLook(consultation,record);}catch(e){if(epoch.current===generation)setSaveWarning('Preview saved here but not synced: '+e.message);}
      if(epoch.current!==generation)return;
      correctionsByPhoto.current[key]=corrections;
      setLooks(current => [{ ...record, saved }, ...current]); setSelectedIds(current=>({...current,[photo.id]:record.id}));
      if(!saved)throw new Error('The last preview could not be saved on this tablet. Save it before creating more previews.');
      return record;
  }
  async function runRenderPlan(plan) {
    if(controller.current)return;
    const generation=epoch.current;const abort=new AbortController();controller.current=abort;
    setBusy(true);setError('');setSaveWarning('');
    try {
      for(const job of plan.jobs){
        if(job.status==='done')continue;
        abort.signal.throwIfAborted();
        job.status='running';if(plan.batch)setBatch({...plan,jobs:plan.jobs.map(j=>({...j}))});
        const timer=setTimeout(()=>abort.abort('timeout'),270_000);
        try{
          const record=await renderPhoto({...plan,photo:job.photo,generation,abort});
          if(epoch.current!==generation)return;
          if(!record)throw new Error('The consultation changed before this preview could be saved.');
          job.status='done';
        }catch(e){job.status=abort.signal.aborted?'stopped':'failed';throw e;}
        finally{clearTimeout(timer);}
        if(plan.batch)setBatch({...plan,jobs:plan.jobs.map(j=>({...j}))});
      }
    }catch(e){
      if(epoch.current===generation)setError(abort.signal.aborted?'Rendering stopped. Completed previews are saved. An image already started may still be charged.':(e.message || 'Unable to create this preview.'));
    }finally{
      if(epoch.current===generation){if(plan.batch)setBatch({...plan,jobs:plan.jobs.map(j=>({...j}))});setBusy(false);controller.current=null;}
    }
  }
  async function generate(quality,customPrompt='',correction=null,availableSurfaces=null) {
    if(!photo || controller.current)return;
    setBatch(null);batchPlan.current=null;
    return runRenderPlan({jobs:[{photo,status:'waiting'}],design:structuredClone(design),quality,customPrompt,correction,availableSurfaces,consultation:syncRef.current.session});
  }
  async function generateAll(retry=false) {
    if(controller.current || mode!=='kitchen' || photos.length<2)return;
    const plan=retry?batchPlan.current:{batch:true,jobs:photos.map(photo=>({photo,status:'waiting'})),design:structuredClone(design),quality:'preview',consultation:syncRef.current.session};
    if(!plan)return;
    batchPlan.current=plan;return runRenderPlan(plan);
  }
  async function renamePhotoView(id,viewLabel) {
    const value=viewLabel.trim().slice(0,60);if(!value || controller.current)return;
    setPhotos(current=>current.map(p=>p.id===id?{...p,viewLabel:value}:p));setLooks(current=>current.map(r=>r.photoId===id?{...r,viewLabel:value}:r));
    await updateSavedView(id,value);await syncRef.current.labelPhoto(syncRef.current.session,id,value);
  }
  async function removeLook(record) {
    if(controller.current)throw new Error('Wait for rendering to finish before deleting a preview.');
    if(record.consultationId)await syncRef.current.removeLook(record);
    await deleteRender(record.id);
    window.dispatchEvent(new CustomEvent('visualizer-renders-deleted',{detail:[record.id]}));
    setLooks(current=>withoutRender(current,record.id));
    setSelectedIds(current=>Object.fromEntries(Object.entries(current).filter(([,id])=>id!==record.id)));
  }
  const sync=useConsultationSync({snapshot:{allPhotos,looks},onClear:(home)=>{window.dispatchEvent(new Event('portfolio-session-reset'));if(home)navigate('/',{replace:true});},onRemote:({id,name,photos:remotePhotos,looks:remoteLooks,deletedLookIds=[],replacing})=>{
    for(const id of deletedLookIds)void deleteRender(id).catch(()=>{});
    if(deletedLookIds.length)window.dispatchEvent(new CustomEvent('visualizer-renders-deleted',{detail:deletedLookIds}));
    if(replacing){reset();setPhotos(remotePhotos);setLooks([...remoteLooks].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));setPhotoIds({kitchen:remotePhotos.find(p=>p.mode==='kitchen')?.id || null,exterior:remotePhotos.find(p=>p.mode==='exterior')?.id || null});setMode(remotePhotos[0]?.mode || 'kitchen');
      const initial={kitchen:newDesign('kitchen'),exterior:newDesign('exterior')};
      for(const mode of ['kitchen','exterior']){const latest=[...remoteLooks].filter(r=>r.design.mode===mode).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];if(latest){const {customPrompt,...design}=latest.design;initial[mode]=design;}}
      setDesigns(initial);window.dispatchEvent(new Event('consultation-switched'));
    }else{
      setPhotos(current=>[...current.map(p=>remotePhotos.find(r=>r.id===p.id) || p),...remotePhotos.filter(p=>!current.some(item=>item.id===p.id))]);
      setLooks(current=>[...current.filter(r=>!deletedLookIds.includes(r.id)).map(r=>remoteLooks.find(remote=>remote.id===r.id) || r),...remoteLooks.filter(r=>!current.some(item=>item.id===r.id))].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
      setSelectedIds(current=>Object.fromEntries(Object.entries(current).filter(([,id])=>!deletedLookIds.includes(id))));
      setPhotoIds(current=>({...current,kitchen:current.kitchen || remotePhotos.find(p=>p.mode==='kitchen')?.id || null,exterior:current.exterior || remotePhotos.find(p=>p.mode==='exterior')?.id || null}));
    }
    for(const p of remotePhotos)if(p.viewLabel)void updateSavedView(p.id,p.viewLabel).catch(()=>{});
    for(const r of remoteLooks){const key=`${r.photoId}:${r.design.mode}`;if(r.regions?.length && !analysisCache.current[key])analysisCache.current[key]={status:r.regions.some(region=>region.surface==='shutters')?'ready':'interrupted',regions:r.regions};if(!correctionsByPhoto.current[key])correctionsByPhoto.current[key]=r.corrections || [];}
    setAnalyses({...analysisCache.current});setLabel(name);
  }});
  syncRef.current=sync;
  return <Context.Provider value={{ allPhotos, advancedMode, setAdvancedMode, renamePhotoView, photo, photos, addPhotos, selectPhoto, design, setDesign, looks, selectedId, setSelectedId, label, setLabel, busy, error, setError, saveWarning, generate, generateAll, batch, removeLook, analyses, analyzePhoto, switchMode, sync, reset, cancel: () => controller.current?.abort() }}>{children}</Context.Provider>;
}
