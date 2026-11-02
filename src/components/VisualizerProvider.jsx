import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { callVisualizer, connectionSettings, imageDataBlob } from '../lib/visualizerClient';
import { saveRender } from '../lib/visualizerStorage';

const Context = createContext(null);
export const useVisualizer = () => useContext(Context);
export const newDesign = (mode = 'kitchen') => ({ mode, sidingMaterial: 'auto', surfaces: {}, hardwareStyle: 'keep', hardwareFinish: 'keep', backsplash: 'keep', countertop: 'keep' });
export default function VisualizerProvider({ children }) {
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [analyses,setAnalyses]=useState({});
  const analysisCache=useRef({}); const analysisController=useRef(null); const analysisTask=useRef(null);const analysisTasks=useRef({});
  const selection=useRef({photoId,mode:design.mode});selection.current={photoId,mode:design.mode};
  const correctionsByPhoto=useRef({});
  const controller = useRef(null);
  const epoch = useRef(0);
  const reset = () => {
    epoch.current += 1; controller.current?.abort(); controller.current = null; analysisController.current?.abort(); analysisCache.current={}; analysisTasks.current={};analysisTask.current=null; correctionsByPhoto.current={}; setAnalyses({});
    setPhotos([]); setPhotoIds({kitchen:null,exterior:null});setMode('kitchen');setDesigns({kitchen:newDesign('kitchen'),exterior:newDesign('exterior')});setLooks([]);setSelectedIds({}); setLabel(''); setBusy(false); setError(''); setSaveWarning('');
  };
  useEffect(() => {
    window.addEventListener('portfolio-session-reset', reset);
    return () => { window.removeEventListener('portfolio-session-reset', reset); controller.current?.abort(); analysisController.current?.abort(); };
  }, []);
  const addPhotos = (next) => {
    if (controller.current || !next.length) return;
    if(photos.length+next.length>4){setError('Add up to 4 photos for each project type.');return;}
    const added = next.map(item => ({ ...item, mode, id:crypto.randomUUID() }));
    setPhotos(current => [...current, ...added]);
    if (!photoId) setPhotoIds(current=>({...current,[mode]:added[0].id}));
    setError(''); setSaveWarning('');
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
  async function generate(quality, customPrompt = '', correction = null) {
    if (!photo || controller.current) return;
    const generation = epoch.current;
    const abort = new AbortController(); controller.current = abort;
    const timer = setTimeout(() => abort.abort('timeout'), 270_000);
    setBusy(true); setError(''); setSaveWarning('');
    try {
      const chosenDesign=correction?.record.design || design;
      const submittedDesign = { ...chosenDesign, surfaces: Object.fromEntries(Object.entries(chosenDesign.surfaces).filter(([, value]) => value)) };
      delete submittedDesign.customPrompt;
      const manual = (customPrompt || correction?.record.design.customPrompt || '').trim();
      const key=`${photo.id}:${submittedDesign.mode}`;
      if(analysisTasks.current[key] && analysisCache.current[key]?.status==='loading')await Promise.race([analysisTasks.current[key],new Promise(resolve=>abort.signal.addEventListener('abort',resolve,{once:true}))]);
      if(abort.signal.aborted || epoch.current!==generation)return;
      const regions=submittedDesign.mode==='exterior'?(analysisCache.current[key]?.regions || []):[];
      const previousNotes=[...new Set([...(correction?.record.corrections || []),...(correctionsByPhoto.current[key] || [])])].slice(-5);
      const corrections=correction?[...previousNotes,correction.feedback.trim()].slice(-5):previousNotes;
      let revision;
      if(correction) {
        const image=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Unable to read the previous preview.'));reader.readAsDataURL(correction.record.rawRenderPhoto || correction.record.renderPhoto);});
        revision={image,feedback:correction.feedback.trim()};
      }
      const data = await callVisualizer('/api/render', { ...connectionSettings(), signal: abort.signal, body: { image: photo.dataUrl, design: submittedDesign, quality, ...(regions.length?{regions}:{}), ...(corrections.length?{corrections}:{}), ...(revision?{correction:revision}:{}), ...(manual ? {customPrompt:manual} : {}) } });
      const {labelRender}=await import('../lib/renderLabel');
      const finalDesign=structuredClone({...submittedDesign,...(manual?{customPrompt:manual}:{})});
      const rawRenderPhoto=imageDataBlob(data.image);
      const renderPhoto = await labelRender(rawRenderPhoto,finalDesign);
      if (epoch.current !== generation) return;
      const record = { id: crypto.randomUUID(), photoId:photo.id, originalPhoto: photo.blob, renderPhoto, rawRenderPhoto, corrections, regions, design: structuredClone({...submittedDesign,...(manual ? {customPrompt:manual} : {})}), consultationLabel: label.trim() || `Consultation ${new Date().toLocaleString()}`, createdAt: new Date().toISOString(), model: data.model, quality };
      let saved = false;
      try { await saveRender(record); saved = true; }
      catch (e) { if (epoch.current === generation) setSaveWarning(e.message || 'This preview could not be saved on this tablet. Use Save Image before leaving.'); }
      if (epoch.current !== generation) return;
      correctionsByPhoto.current[key]=corrections;
      setLooks(current => [{ ...record, saved }, ...current]); setSelectedId(record.id);
    } catch (e) {
      if (epoch.current === generation) setError(abort.signal.aborted ? 'Rendering stopped. If it had already started, the image service may still charge for it. You can try again when ready.' : (e.message || 'Unable to reach the image service. Check your connection.'));
    } finally {
      clearTimeout(timer);
      if (epoch.current === generation) { setBusy(false); controller.current = null; }
    }
  }
  return <Context.Provider value={{ photo, photos, addPhotos, selectPhoto, design, setDesign, looks, selectedId, setSelectedId, label, setLabel, busy, error, setError, saveWarning, generate, analyses, analyzePhoto, switchMode, reset, cancel: () => controller.current?.abort() }}>{children}</Context.Provider>;
}
