import { useEffect, useMemo, useRef, useState } from 'react';
import { useVisualizer } from '../components/VisualizerProvider';
import { colors } from '../data/colors';
import { useOnline } from '../hooks/useOnline';
import { preparePhoto } from '../lib/visualizerPhoto';
import VisualizerAdvanced from '../components/VisualizerAdvanced';
import {renderName,renderDetails,renderFilename} from '../lib/renderNames';
import RenderLibrary from '../components/RenderLibrary';
import { listRenders } from '../lib/visualizerStorage';
import { callVisualizer, connectionSettings, saveConnection } from '../lib/visualizerClient';
import { navigate } from '../lib/navigation';
import { useOperatorUnlock } from '../hooks/useOperatorUnlock';
import VisualizerPhotoView from '../components/VisualizerPhotoView';
import VisualizerCorrection from '../components/VisualizerCorrection';
import ConsultationLibrary from '../components/ConsultationLibrary';
import VisualizerPhotos from '../components/VisualizerPhotos';
import VisualizerConnection from '../components/VisualizerConnection';
import VisualizerCabinets from '../components/VisualizerCabinets';
import VisualizerExteriorSteps, {ExteriorStepNavigation} from '../components/VisualizerExteriorSteps';
import VisualizerPalette from '../components/VisualizerPalette';
import VisualizerOptions, {finishOptions} from '../components/VisualizerOptions';
import {cabinetLayout, cabinetTones, cabinetSurfaces, exteriorSurfaces, detectedExteriorSurfaces, surfaceNames} from '../lib/visualizerDesign';

function useBlobUrl(blob) {
  const [url, setUrl] = useState('');
  useEffect(() => { if (!blob) { setUrl(''); return; } const next = URL.createObjectURL(blob); setUrl(next); return () => URL.revokeObjectURL(next); }, [blob]);
  return url;
}
function SavedThumb({ record, onSelect }) {
  const url = useBlobUrl(record.renderPhoto);
  return <button className="viz-saved-item" onClick={() => onSelect(record)}><img src={url} alt="Saved design preview" /><span>{renderName(record)}<small>{renderDetails(record)}</small><small>{record.consultationLabel}</small><small>{new Date(record.createdAt).toLocaleString()}</small></span></button>;
}
async function exportImage(record, share = false) {
  const ext = record.renderPhoto.type === 'image/webp' ? 'webp' : record.renderPhoto.type === 'image/png' ? 'png' : 'jpg';
  const file = new File([record.renderPhoto], `${renderFilename(record)}.${ext}`, { type: record.renderPhoto.type });
  if (share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Your Spray-Net Design Preview' }); return;
  }
  const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export default function Visualizer() {
  const v = useVisualizer(); const online = useOnline();
  const [surface, setSurface] = useState('cabinets');
  const [tone, setTone] = useState('dark'); const [paletteSession, setPaletteSession] = useState(0);
  const [kitchenPanel, setKitchenPanel] = useState(v.advancedMode?'advanced':'colors');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [operatorReady, setOperatorReady] = useState(false);
  const [promptDrafts,setPromptDrafts]=useState({});
  const [connected, setConnected] = useState(false);
  const [toolMessage, setToolMessage] = useState(''); const [saved, setSaved] = useState([]); const [archived, setArchived] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false); const [before, setBefore] = useState(false);
  const [showHighlight,setShowHighlight]=useState(true);
  const [manualSurfacePhotoId,setManualSurfacePhotoId]=useState(null);
  const [correctionTarget,setCorrectionTarget]=useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenDialog = useRef(null);
  const fileInput = useRef(null); const cameraInput = useRef(null); const photoEpoch = useRef(0);
  const current = archived || v.looks.find(r => r.id === v.selectedId);
  const sourceKey=archived?.id || (!before && current?current.id:v.photo?.id) || 'none';
  const customPrompt=promptDrafts[sourceKey] || '';
  const setCustomPrompt=text=>setPromptDrafts(d=>({...d,[sourceKey]:text}));
  const namedRecords=[...v.looks,...saved.filter(r=>!v.looks.some(look=>look.id===r.id))].map(r=>({...r,viewLabel:v.allPhotos.find(p=>p.id===r.photoId)?.viewLabel || r.viewLabel}));
  function toggleAdvanced(){const next=!v.advancedMode;v.setAdvancedMode(next);setKitchenPanel(next?'advanced':'colors');if(!next)setPromptDrafts({});}
  function submitCustom(quality){setShowHighlight(false);const base=!before && current && !archived?{record:current,feedback:customPrompt}:null;setBefore(false);v.generate(quality,customPrompt,base,v.design.mode==='exterior'?availableSurfaces:null);}

  useEffect(()=>{const deleted=event=>{setSaved(current=>current.filter(r=>!event.detail.includes(r.id)));setArchived(current=>event.detail.includes(current?.id)?null:current);};window.addEventListener('visualizer-renders-deleted',deleted);return()=>window.removeEventListener('visualizer-renders-deleted',deleted);},[]);
  const angleLooks = v.looks.filter(r => r.photoId === v.photo?.id);
  const unlock = useOperatorUnlock(() => setToolsOpen(true));
  const closeTools = () => setToolsOpen(false);
  const previewUrl = useBlobUrl(current?.renderPhoto); const originalUrl = useBlobUrl(current?.originalPhoto || v.photo?.blob);
  const [elapsed, setElapsed] = useState(0);
  const pairingCode = useRef(new URLSearchParams(window.location.hash.split('?')[1] || '').get('tablet'));
  useEffect(() => { if (!v.busy) { setElapsed(0); return; } const started = Date.now(); const timer = setInterval(() => setElapsed(Math.floor((Date.now()-started)/1000)), 1000); return () => clearInterval(timer); }, [v.busy]);
  useEffect(() => { let active = true; const c = connectionSettings(); if (c.endpoint && c.token && online) callVisualizer('/api/session', { ...c, signal: AbortSignal.timeout(10_000) }).then(data => { if (active) { setConnected(true); setOperatorReady(Boolean(data.operatorAuthorized)); } }).catch(() => { if (active) { setConnected(false); setOperatorReady(false); } }); return () => { active = false; }; }, [online]);
  useEffect(() => {
    const code = pairingCode.current;
    if (!code) return;
    navigate('/visualize', { replace: true });
    let active = true;
    async function pair() {
      try {
        if (code.length > 2048) throw new Error('This tablet setup link is invalid.');
        const parsed = JSON.parse(atob(code.replace(/-/g,'+').replace(/_/g,'/')));
        if (typeof parsed.endpoint !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(parsed.token || '')) throw new Error('This tablet setup link is invalid.');
        const session = await callVisualizer('/api/session', { ...parsed, signal: AbortSignal.timeout(15_000) });
        if (!active) return;
        saveConnection(parsed.endpoint, parsed.token, parsed.operatorToken); setConnected(true); setOperatorReady(Boolean(session.operatorAuthorized)); setToolMessage('This tablet is connected.');
      } catch (e) { if (active) { setToolsOpen(true); setToolMessage(e.message || 'Unable to connect this tablet.'); } }
    }
    pair(); return () => { active = false; };
  }, []);
  useEffect(() => () => { photoEpoch.current += 1; }, []);
  useEffect(()=>{const changed=()=>{setArchived(null);setSaved([]);setBefore(false);setCorrectionTarget(null);setPromptDrafts({});setKitchenPanel('colors');setSurface('siding');setTone('dark');};window.addEventListener('consultation-switched',changed);return()=>window.removeEventListener('consultation-switched',changed);},[]);
  useEffect(()=>{const clear=()=>{setCorrectionTarget(null);setArchived(null);setSaved([]);setToolsOpen(false);setPromptDrafts({});setKitchenPanel('colors');};window.addEventListener('portfolio-session-reset',clear);return()=>window.removeEventListener('portfolio-session-reset',clear);},[]);
  useEffect(() => { if (fullscreen) fullscreenDialog.current?.showModal(); else fullscreenDialog.current?.close(); }, [fullscreen]);
  const layout = cabinetLayout(v.design.surfaces);
  const twoTone = v.design.mode === 'kitchen' && layout !== 'one-tone';
  const tones = cabinetTones(v.design.surfaces);
  const analysis=v.analyses[`${v.photo?.id}:${v.design.mode}`];
  const manualSurfaces=Boolean(v.photo && manualSurfacePhotoId===v.photo.id);
  const availableSurfaces=manualSurfaces?exteriorSurfaces:detectedExteriorSurfaces(analysis);
  const detecting=v.design.mode==='exterior' && v.photo && connected && online && (!analysis || ['loading','interrupted'].includes(analysis.status));
  const detectionStatus=detecting?'loading':v.photo && (!connected || !online)?'connection':analysis?.status;
  const activeSurface = v.design.mode === 'exterior' ? (availableSurfaces.includes(surface) ? surface : availableSurfaces[0] || '')
    : !twoTone ? 'cabinets' : tone === 'light' ? (layout === 'wall-base' ? 'upperCabinets' : 'cabinets') : (layout === 'wall-base' ? 'lowerCabinets' : 'island');
  const region=analysis?.regions?.find(item=>item.surface===activeSurface);
  useEffect(()=>{if(v.design.mode==='exterior' && v.photo && connected && online)v.analyzePhoto(v.design.mode);},[v.photo?.id,v.design.mode,connected,online]);
  const previousSurface=useRef({photoId:v.photo?.id,surface:activeSurface});
  useEffect(()=>{const previous=previousSurface.current;if(previous.photoId!==v.photo?.id || previous.surface!==activeSurface){setShowHighlight(true);if(previous.photoId===v.photo?.id && !v.busy)setBefore(true);previousSurface.current={photoId:v.photo?.id,surface:activeSurface};}},[activeSurface,v.photo?.id]);
  const collection = useMemo(() => {
    const systems = v.design.mode === 'kitchen' ? ['kitchen'] : ({brick:['brick'],stucco:['elasto'],frontDoor:['dw'],garageDoor:['dw'],windows:['dw'],siding:['vinyl','mat','satin','brick','elasto'],siding2:['vinyl','mat','satin','brick','elasto']}[activeSurface] || ['mat','satin','dw']);
    return colors.filter(c => c.referenceOnly || c.systems.some(system => systems.includes(system)));
  }, [v.design.mode, activeSurface]);
  const selectedColor = colors.find(c => c.id === v.design.surfaces[activeSurface]);
  const changes = Object.entries(v.design.surfaces).filter(([key,value]) => value && (v.design.mode!=='exterior' || availableSurfaces.includes(key)));
  const removingShutters=v.design.mode==='exterior' && v.design.shutterAction==='remove' && availableSurfaces.includes('shutters');
  const hasChanges = (changes.length > 0 || removingShutters || Object.keys(finishOptions).some(key => v.design[key] !== 'keep')) && (!twoTone || !changes.length || Boolean(tones.light && tones.dark));
  const setColor = id => {
    v.setDesign(d => {
      if (d.mode === 'exterior') return {...d,...(activeSurface==='shutters'?{shutterAction:'keep'}:{}),surfaces:{...d.surfaces,[activeSurface]:id}};
      if (cabinetLayout(d.surfaces)==='one-tone') return {...d,surfaces:cabinetSurfaces('one-tone',id)};
      const current=cabinetTones(d.surfaces); const next=tone==='light'?{...current,light:id}:{...current,dark:id};
      return {...d,surfaces:cabinetSurfaces(cabinetLayout(d.surfaces),next.light,next.dark)};
    });
    if (twoTone && tone==='dark' && id) setTone('light');
  };
  async function upload(files) {
    const batch = Array.from(files || []); if (!batch.length || v.busy || loadingPhoto) return;
    if (batch.length + v.photos.length > 4) { v.setError('Add up to 4 photos for each project type. Kitchen and exterior photos are kept separately.'); return; }
    const epoch = ++photoEpoch.current; setLoadingPhoto(true); v.setError('');
    const prepared = []; const failures = [];
    for (const [index,file] of batch.entries()) {
      try { const next = await preparePhoto(file); if (epoch !== photoEpoch.current) return; prepared.push({...next,name:file.name}); }
      catch (e) { failures.push('Photo '+(index+1)+': '+e.message); }
    }
    if (epoch !== photoEpoch.current) return;
    try{await v.addPhotos(prepared);}catch(e){v.setError(e.message);setLoadingPhoto(false);return;} setArchived(null); setBefore(false); setLoadingPhoto(false);
    if (failures.length) v.setError(failures.join(' '));
  }
  function switchMode(mode) { if (mode === v.design.mode) return; v.switchMode(mode);setArchived(null);setBefore(false);setShowHighlight(true); setSurface('siding'); setTone('dark'); setKitchenPanel(v.advancedMode?'advanced':'colors'); setPaletteSession(n=>n+1); }
  function changeLayout(nextLayout) {
    setTone(nextLayout==='one-tone'?'light':'dark');
    if(nextLayout===layout)return;
    v.setDesign(d=>{const current=cabinetTones(d.surfaces);return {...d,surfaces:cabinetSurfaces(nextLayout,current.light,current.dark)};});
  }
  async function loadSaved() { const epoch = photoEpoch.current; try { const records = await listRenders(); if (epoch !== photoEpoch.current) return; setSaved(records); setToolMessage('Saved previews are stored on this device only.'); } catch(e) { if (epoch === photoEpoch.current) setToolMessage(e.message); } }
  async function removeSaved() { if (!archived || !window.confirm('Permanently delete this preview? Shared previews will be removed from both tablets.')) return; try { await v.removeLook(archived); setArchived(null); await loadSaved(); } catch(e) { setToolMessage(e.message); } }
  async function exportCurrent(share) { try { await exportImage(current, share); } catch(e) { if(e.name !== 'AbortError') setToolMessage('Unable to export this image. Please try Save Image.'); } }
  function showPreview(quality, manual = '') { setBefore(false); setShowHighlight(false); v.generate(quality, manual, null, v.design.mode==='exterior'?availableSurfaces:null); }
  return <div className={`visualizer-app ${v.design.mode==='exterior'?'is-exterior':''} ${toolsOpen?'with-tools':''}`}>
    <h1 className="sr-only" tabIndex={-1}>Design Visualizer</h1>
    <div className="viz-toolbar"><div className="chips" role="group" aria-label="Project type">
      {['kitchen','exterior'].map(mode => <button {...unlock} key={mode} className={`chip ${v.design.mode === mode ? 'selected' : ''}`} aria-pressed={v.design.mode === mode} disabled={v.busy || loadingPhoto} onClick={event => { if (!unlock.onClick(event)) switchMode(mode); }}>{mode === 'kitchen' ? 'Kitchen & Cabinets' : 'Home Exterior'}</button>)}
    </div>{v.sync.enabled && <span className="viz-sync-status" role="status">{v.sync.status || 'Connecting Tablets...'}</span>}</div>
    {toolsOpen && <section className="viz-tools" aria-label="Consultation tools">
      <div className="viz-tools-heading"><h2>Consultation Tools</h2><button className="button" onClick={closeTools}>Close Tools</button></div>
      <VisualizerConnection connected={connected} online={online} onConnected={data => {setConnected(true);setOperatorReady(Boolean(data.operatorAuthorized));setToolMessage('');}} onForgotten={() => {setConnected(false);setOperatorReady(false);v.setAdvancedMode(false);setKitchenPanel('colors');setPromptDrafts({});setToolMessage('');}} />
      {v.sync.enabled && <ConsultationLibrary sync={v.sync} busy={v.busy || loadingPhoto} onOpened={()=>{setArchived(null);setSaved([]);setBefore(false);closeTools();}}/>}
      <div className="viz-actions"><button className="button" onClick={loadSaved}>Saved Previews on This Tablet</button></div>
      <RenderLibrary records={namedRecords} busy={v.busy} operatorReady={operatorReady} onDelete={async record=>{await v.removeLook(record);if(archived?.id===record.id)setArchived(null);if(saved.length)await loadSaved();}}/>
      {current && <div className="viz-actions"><button className="button" onClick={()=>exportCurrent(false)}>Save Image</button><button className="button" onClick={()=>exportCurrent(true)}>Share Image</button></div>}
      <p role="status">{toolMessage}</p>
      {!!saved.length && <div className="viz-saved-list">{saved.map(record => <SavedThumb key={record.id} record={record} onSelect={r => { setArchived(r); setBefore(false);closeTools(); }} />)}</div>}

      <button className="button button-dark" disabled={!operatorReady || !v.photo || !hasChanges || !connected || !online || v.busy || loadingPhoto || !!archived} onClick={()=>{closeTools();showPreview('detail');}}>Create Detailed Preview</button>
      {current && !archived && <div className="viz-actions"><button className="button" disabled={!operatorReady || !online || v.busy} onClick={()=>{setCorrectionTarget({kind:'preview',record:current});closeTools();}}>Correct This Preview</button></div>}
      {v.design.mode==='exterior' && v.photo && !archived && <div className="viz-actions"><button className="button" disabled={!operatorReady || !online || v.busy || analysis?.status==='loading'} onClick={()=>{setCorrectionTarget({kind:'areas'});closeTools();}}>Correct Detected Areas</button></div>}
      {v.design.mode==='exterior' && v.photo && <button className="button" disabled={!operatorReady || v.busy} aria-pressed={manualSurfaces} onClick={()=>setManualSurfacePhotoId(manualSurfaces?null:v.photo.id)}>{manualSurfaces?'Use Detected Surfaces Only':'Show All Surface Options'}</button>}
      <div className="viz-advanced-toggle"><button className="button" role="switch" aria-checked={v.advancedMode} disabled={!operatorReady || v.busy} onClick={toggleAdvanced}>Advanced Mode: {v.advancedMode?'On':'Off'}</button><p>Turn on custom instructions for the main visualizer. Close Tools, select an image, then describe your changes.</p></div>
        {!v.sync.enabled && <label className="viz-label">Consultation Label <span>(Optional)</span><input value={v.label} maxLength={100} placeholder="For finding these previews later" onChange={e => v.setLabel(e.target.value)} /></label>}
        {!v.sync.enabled && <button className="viz-text-button" disabled={v.busy} onClick={() => { if (!v.photo || window.confirm('Start a new consultation? Saved previews will stay on this tablet.')) { photoEpoch.current += 1; v.reset(); setArchived(null); setSaved([]); setToolsOpen(false); setPromptDrafts({}); setToolMessage(''); setBefore(false); setLoadingPhoto(false); setSurface('siding'); setTone('dark'); setKitchenPanel(v.advancedMode?'advanced':'colors'); setPaletteSession(n=>n+1); } }}>Start a New Consultation</button>}
    </section>}
    {!toolsOpen && <>
    {v.design.mode==='exterior' && <VisualizerExteriorSteps active={activeSurface} available={availableSurfaces} surfaces={v.design.surfaces} onSelect={setSurface} disabled={v.busy} status={detectionStatus}/>}
    <div className="viz-workspace">
      <section className="viz-canvas-column" aria-label="Your design preview">
        <div className="viz-photo-stage">
          {originalUrl ? <VisualizerPhotoView src={current && !before ? previewUrl : originalUrl} alt={current && !before ? 'AI design preview of the selected finishes' : 'Original photo of your home'} region={region} showHighlight={v.design.mode==='exterior' && showHighlight && (!current || before) && !archived && !v.busy && kitchenPanel!=='hardware'}/> : <div className="viz-upload-intro"><h2>Preview Your Home</h2><p>See how new colors and finishes could look in your kitchen or on your home's exterior.</p><p>Take a photo or choose your photos, then pick your colors and finishes. Tap Create My Preview to see your idea and explore another look.</p><div className="viz-upload-actions"><button className="button button-dark" onClick={() => cameraInput.current?.click()}>Take a Photo</button><button className="button" onClick={() => fileInput.current?.click()}>Choose Photos</button></div></div>}
        </div>
      </section>
      <section className="viz-controls" id="visualizer-finishes" aria-label="Choose your finishes">
        <h2 className="sr-only">Choose Your Finishes</h2>
        <div className="viz-control-fields">
        {(v.design.mode==='kitchen' || v.advancedMode) && <div className="viz-main-options" role="group" aria-label="Kitchen design options">
          <button className={`button ${kitchenPanel==='colors'?'button-dark':''}`} aria-pressed={kitchenPanel==='colors'} disabled={v.busy} onClick={()=>setKitchenPanel('colors')}>Color Options</button>
          {v.design.mode==='kitchen' && <button className={`button ${kitchenPanel==='hardware'?'button-dark':''}`} aria-pressed={kitchenPanel==='hardware'} disabled={v.busy} onClick={()=>setKitchenPanel('hardware')}>Hardware Finishes</button>}
          {v.advancedMode && <button className={`button ${kitchenPanel==='advanced'?'button-dark':''}`} aria-pressed={kitchenPanel==='advanced'} disabled={v.busy} onClick={()=>setKitchenPanel('advanced')}>Advanced Instructions</button>}
        </div>}
        {v.advancedMode && kitchenPanel==='advanced'?<VisualizerAdvanced photo={v.photo} name={current && !before?renderName(current,v.photo):v.photo?.viewLabel || 'Original Photo'} prompt={customPrompt} onPrompt={setCustomPrompt} onSubmit={submitCustom} onExit={toggleAdvanced} onRename={name=>v.renamePhotoView(v.photo.id,name)} disabled={!operatorReady || v.busy || loadingPhoto || !!archived} canRender={operatorReady && connected && online && !!v.photo && !v.busy && !loadingPhoto && !archived}/> : v.design.mode==='exterior' && !activeSurface?<div className="viz-surface-empty"><strong>{detectionStatus==='loading'?'Finding the Options for This Photo':detectionStatus==='connection'?'Connect to Detect Visible Surfaces':v.photo?'No Editable Surfaces Found':'Start With Your Exterior Photo'}</strong><p>{detectionStatus==='loading'?'Color options will appear when detection finishes.':v.photo?'Your representative can retry or correct detection if an area was missed.':'Upload a photo to see only the surfaces visible in that view.'}</p></div>:v.design.mode==='kitchen' && kitchenPanel==='hardware' ? <>
          <VisualizerOptions design={v.design} onChange={v.setDesign} disabled={v.busy}/>
          {twoTone && changes.length>0 && !(tones.light&&tones.dark) && <p className="viz-notice">Choose both cabinet colors in Color Options to finish your two-tone preview.</p>}
        </> : <>
          {v.design.mode==='kitchen' ? <VisualizerCabinets layout={layout} tone={tone} light={colors.find(c=>c.id===tones.light)} dark={colors.find(c=>c.id===tones.dark)} onLayout={changeLayout} onTone={setTone} disabled={v.busy}/>
            : <ExteriorStepNavigation active={activeSurface} available={availableSurfaces} onSelect={setSurface} disabled={v.busy}/>}
          {activeSurface==='shutters' && <div className="viz-shutter-options" role="group" aria-label="Shutter treatment"><button className={`button ${!removingShutters?'button-dark':''}`} aria-pressed={!removingShutters} disabled={v.busy} onClick={()=>v.setDesign(d=>({...d,shutterAction:'keep'}))}>Change Color</button><button className={`button ${removingShutters?'button-dark':''}`} aria-pressed={removingShutters} disabled={v.busy} onClick={()=>v.setDesign(d=>{const surfaces={...d.surfaces};delete surfaces.shutters;return {...d,surfaces,shutterAction:'remove'};})}>Remove Shutters</button></div>}
          {!twoTone && <div className="viz-selection"><div>{v.design.mode==='exterior' && <span>{surfaceNames[activeSurface]}{activeSurface==='siding'?'  -  Main Area':activeSurface==='siding2'?'  -  Accent Area':''}</span>}<strong>{activeSurface==='shutters' && removingShutters?'Shutters Will Be Removed':selectedColor?.name || 'Keep Existing Finish'}</strong></div><button className="viz-text-button" disabled={v.busy} onClick={()=>setColor('')}>Keep Existing</button></div>}
          {activeSurface==='shutters' && removingShutters?<p className="viz-notice">The surrounding wall finish will continue behind the removed shutters. Windows and frames stay in place.</p>:<VisualizerPalette key={paletteSession} collection={collection} selectedId={selectedColor?.id} onSelect={setColor} disabled={v.busy} target={surfaceNames[activeSurface]}/>}
        </>}
        </div>
        {!online && <p className="viz-notice">Connect to the internet to create a new preview. Saved images and color selections still work offline.</p>}
        {!connected && online && <p className="viz-notice">Ask your representative to connect this tablet.</p>}
        {v.error && <p className="viz-error" role="alert">{v.error}</p>}
        {!(v.advancedMode && kitchenPanel==='advanced') && <div className="viz-generate"><button className="button button-dark" disabled={!v.photo || !hasChanges || !connected || !online || v.busy || loadingPhoto || !!archived} onClick={() => showPreview('preview')}>{v.busy ? 'Creating Preview...' : 'Create My Preview'}</button>
          {v.design.mode==='kitchen' && v.photos.length>1 && <button className="button viz-render-all" disabled={!v.photo || !hasChanges || !connected || !online || v.busy || loadingPhoto || !!archived} onClick={()=>{setBefore(false);setShowHighlight(false);v.generateAll();}}>Render All {v.photos.length} Photos</button>}
          {v.design.mode==='kitchen' && v.batch && !v.busy && <div className="viz-batch-result" role="status"><span>{v.batch.jobs.filter(j=>j.status==='done').length} of {v.batch.jobs.length} Previews Saved</span>{v.batch.jobs.some(j=>j.status!=='done') ? <button className="button" disabled={!connected || !online || !!archived} onClick={()=>v.generateAll(true)}>Retry Unfinished Photos</button> : <span>Tap a photo to view its preview.</span>}</div>}
        </div>}
      </section>
        <VisualizerPhotos photos={v.photos} photoId={v.photo?.id} previews={v.looks} selectedIds={v.selectedIds} disabled={v.busy || loadingPhoto} onSelect={id => { v.selectPhoto(id); setArchived(null); setBefore(false); }} />
      <section className="viz-media-panel" aria-label="Photo controls">
          {v.busy && <div className="viz-working" role="status"><span className="viz-spinner" /><strong>{v.batch?`Creating Photo ${v.batch.jobs.findIndex(j=>j.status==='running')+1} of ${v.batch.jobs.length}`:'Creating Your Preview'}</strong><span>{elapsed}s elapsed. You can browse the portfolio while we work.</span><button onClick={v.cancel}>{v.batch?'Stop Remaining Previews':'Stop Waiting'}</button></div>}
        <input className="sr-only" ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="Choose home photo" onChange={e => { upload(e.target.files); e.target.value = ''; }} />
        <input className="sr-only" ref={cameraInput} type="file" accept="image/*" capture="environment" aria-label="Take home photo" onChange={e => { upload(Array.from(e.target.files || [])); e.target.value = ''; }} />
        {loadingPhoto && <p role="status">Preparing Your Photo...</p>}
        <div className="viz-actions viz-photo-actions">
        {v.photo && !archived && <button className="button" disabled={v.busy || loadingPhoto} onClick={() => fileInput.current?.click()}>Add Photos</button>}
        {originalUrl && <button className="button" onClick={() => setFullscreen(true)}>View Fullscreen</button>}
          {current && <button className="button" aria-label={before ? 'Show Design Preview' : 'Show Original'} aria-pressed={before} onClick={() => {setBefore(!before);setShowHighlight(false);}}>{before ? 'Show Design Preview' : 'Show Original'}</button>}
        </div>
        {v.photo && !archived && v.design.mode==='exterior' && analysis && analysis.status!=='loading' && <div className="viz-detection" role="status">
          <span title={region?.description}>{analysis?.status==='ready'?activeSurface?`${surfaceNames[activeSurface]}: ${region?.polygons?.length?'Approximate Detected Area':'Not Clearly Visible'}${region?.substrate?' - '+region.substrate:''}${region?.existingColor?' / '+region.existingColor:''}`:'No Editable Surfaces Detected':'Surface Highlights Unavailable'}</span>
          {analysis?.status==='ready' && !!region?.polygons?.length && <button className="viz-text-button" disabled={v.busy} onClick={()=>{setShowHighlight(!showHighlight);if(!showHighlight)setBefore(true);}}>{showHighlight?'Hide Highlight':'Show Highlight'}</button>}
          {['error','interrupted'].includes(analysis?.status) && <button className="viz-text-button" disabled={v.busy || !online} onClick={()=>v.analyzePhoto(v.design.mode,true)}>Retry Detection</button>}
        </div>}
        {archived && <div className="viz-actions"><button className="button" onClick={()=>setArchived(null)}>Back to Current Consultation</button><button className="button" disabled={!operatorReady || v.busy} onClick={removeSaved}>Delete Selected Preview</button></div>}
        {v.saveWarning && <p className="viz-error" role="alert">{v.saveWarning}</p>}
        {v.saveWarning && current && <div className="viz-actions"><button className="button" onClick={() => exportCurrent(false)}>Save Image</button><button className="button" onClick={() => exportCurrent(true)}>Share Image</button></div>}
        {!!angleLooks.length && <div className="viz-look-strip" aria-label="This consultation's previews">{angleLooks.map(record => <button key={record.id} className={`chip ${v.selectedId === record.id && !archived ? 'selected' : ''}`} aria-pressed={v.selectedId === record.id && !archived} onClick={() => { v.setSelectedId(record.id); setArchived(null); setBefore(false); }} title={[renderName(record,v.photo),renderDetails(record)].filter(Boolean).join(" · ")}><span>{renderName(record,v.photo)}</span></button>)}</div>}
      </section>
    </div>
    </>}
    {correctionTarget && <VisualizerCorrection areas={correctionTarget.kind==='areas'} notes={correctionTarget.record?.corrections} disabled={v.busy || !online || !operatorReady} onClose={()=>setCorrectionTarget(null)} onSubmit={feedback=>{setCorrectionTarget(null);setBefore(false);setShowHighlight(false);if(correctionTarget.kind==='areas'){setBefore(true);setShowHighlight(true);v.analyzePhoto(v.design.mode,true,feedback);}else v.generate('preview','',{record:correctionTarget.record,feedback});}}/>}
    <dialog className="viz-fullscreen" ref={fullscreenDialog} onCancel={() => setFullscreen(false)} onClose={() => setFullscreen(false)} aria-label="Fullscreen design photo"><button className="button" autoFocus onClick={() => setFullscreen(false)}>Close Fullscreen</button><img src={current && !before ? previewUrl : originalUrl} alt={current && !before ? 'Design preview fullscreen' : 'Original home photo fullscreen'} /></dialog>
  </div>;
}
