import { useEffect, useMemo, useRef, useState } from 'react';
import { newDesign, useVisualizer } from '../components/VisualizerProvider';
import { colors } from '../data/colors';
import { useOnline } from '../hooks/useOnline';
import { preparePhoto } from '../lib/visualizerPhoto';
import { listRenders, deleteRender } from '../lib/visualizerStorage';
import { callVisualizer, connectionSettings, saveConnection } from '../lib/visualizerClient';
import { navigate } from '../lib/navigation';
import { useOperatorUnlock } from '../hooks/useOperatorUnlock';
import VisualizerPhotos from '../components/VisualizerPhotos';
import VisualizerConnection from '../components/VisualizerConnection';
import VisualizerCabinets from '../components/VisualizerCabinets';
import VisualizerExteriorSteps from '../components/VisualizerExteriorSteps';
import VisualizerPalette from '../components/VisualizerPalette';
import VisualizerOptions, {finishOptions} from '../components/VisualizerOptions';
import {cabinetLayout, cabinetTones, cabinetSurfaces, exteriorSurfaces, surfaceNames} from '../lib/visualizerDesign';

function useBlobUrl(blob) {
  const [url, setUrl] = useState('');
  useEffect(() => { if (!blob) { setUrl(''); return; } const next = URL.createObjectURL(blob); setUrl(next); return () => URL.revokeObjectURL(next); }, [blob]);
  return url;
}
function SavedThumb({ record, onSelect }) {
  const url = useBlobUrl(record.renderPhoto);
  return <button className="viz-saved-item" onClick={() => onSelect(record)}><img src={url} alt="Saved design preview" /><span>{record.consultationLabel}<small>{new Date(record.createdAt).toLocaleString()}</small></span></button>;
}
async function exportImage(record, share = false) {
  const ext = record.renderPhoto.type === 'image/webp' ? 'webp' : record.renderPhoto.type === 'image/png' ? 'png' : 'jpg';
  const file = new File([record.renderPhoto], `spray-net-design-${record.id.slice(0,8)}.${ext}`, { type: record.renderPhoto.type });
  if (share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: 'Your Spray-Net Design Preview' }); return;
  }
  const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
export default function Visualizer() {
  const v = useVisualizer(); const online = useOnline();
  const [surface, setSurface] = useState('cabinets');
  const [tone, setTone] = useState('light'); const [paletteSession, setPaletteSession] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [operatorReady, setOperatorReady] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [connected, setConnected] = useState(false);
  const [toolMessage, setToolMessage] = useState(''); const [saved, setSaved] = useState([]); const [archived, setArchived] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false); const [before, setBefore] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenDialog = useRef(null);
  const fileInput = useRef(null); const cameraInput = useRef(null); const photoEpoch = useRef(0);
  const current = archived || v.looks.find(r => r.id === v.selectedId);
  const angleLooks = v.looks.filter(r => r.photoId === v.photo?.id);
  const unlock = useOperatorUnlock(() => setToolsOpen(true));
  const closeTools = () => { setToolsOpen(false); setCustomPrompt(''); };
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
  useEffect(() => { if (fullscreen) fullscreenDialog.current?.showModal(); else fullscreenDialog.current?.close(); }, [fullscreen]);
  const layout = cabinetLayout(v.design.surfaces);
  const twoTone = v.design.mode === 'kitchen' && layout !== 'one-tone';
  const tones = cabinetTones(v.design.surfaces);
  const activeSurface = v.design.mode === 'exterior' ? (exteriorSurfaces.includes(surface) ? surface : 'siding')
    : !twoTone ? 'cabinets' : tone === 'light' ? (layout === 'wall-base' ? 'upperCabinets' : 'cabinets') : (layout === 'wall-base' ? 'lowerCabinets' : 'island');
  const collection = useMemo(() => {
    const systems = v.design.mode === 'kitchen' ? ['kitchen'] : ({brick:['brick'],stucco:['elasto'],frontDoor:['dw'],garageDoor:['dw'],windows:['dw'],siding:['vinyl','mat','satin']}[activeSurface] || ['mat','satin','dw']);
    return colors.filter(c => c.referenceOnly || c.systems.some(system => systems.includes(system)));
  }, [v.design.mode, activeSurface]);
  const selectedColor = colors.find(c => c.id === v.design.surfaces[activeSurface]);
  const changes = Object.entries(v.design.surfaces).filter(([,value]) => value);
  const hasChanges = (changes.length > 0 || Object.keys(finishOptions).some(key => v.design[key] !== 'keep')) && (!twoTone || Boolean(tones.light && tones.dark));
  const setColor = id => v.setDesign(d => {
    if (d.mode === 'exterior') return {...d,surfaces:{...d.surfaces,[activeSurface]:id}};
    const current=cabinetTones(d.surfaces); const next=tone==='light'?{...current,light:id}:{...current,dark:id};
    return {...d,surfaces:cabinetSurfaces(cabinetLayout(d.surfaces),next.light,next.dark)};
  });
  async function upload(files) {
    const batch = Array.from(files || []); if (!batch.length || v.busy || loadingPhoto) return;
    if (batch.length + v.photos.length > 8) { v.setError('Add up to 8 photos per consultation. Start a new consultation for another project.'); return; }
    const epoch = ++photoEpoch.current; setLoadingPhoto(true); v.setError('');
    const prepared = []; const failures = [];
    for (const [index,file] of batch.entries()) {
      try { const next = await preparePhoto(file); if (epoch !== photoEpoch.current) return; prepared.push({...next,name:file.name}); }
      catch (e) { failures.push('Photo '+(index+1)+': '+e.message); }
    }
    if (epoch !== photoEpoch.current) return;
    v.addPhotos(prepared); setArchived(null); setBefore(false); setLoadingPhoto(false);
    if (failures.length) v.setError(failures.join(' '));
  }
  function switchMode(mode) { if (mode === v.design.mode) return; v.setDesign(newDesign(mode)); setSurface('siding'); setTone('light'); setPaletteSession(n=>n+1); }
  function changeLayout(nextLayout) { if (nextLayout === layout) return; v.setDesign(d => {const current=cabinetTones(d.surfaces);return {...d,surfaces:cabinetSurfaces(nextLayout,current.light,current.dark)};});setTone('light'); }
  async function loadSaved() { const epoch = photoEpoch.current; try { const records = await listRenders(); if (epoch !== photoEpoch.current) return; setSaved(records); setToolMessage('Saved previews are stored on this device only.'); } catch(e) { if (epoch === photoEpoch.current) setToolMessage(e.message); } }
  async function removeSaved() { if (!archived || !window.confirm('Delete this saved preview from this tablet?')) return; try { await deleteRender(archived.id); setArchived(null); await loadSaved(); } catch(e) { setToolMessage(e.message); } }
  async function exportCurrent(share) { try { await exportImage(current, share); } catch(e) { if(e.name !== 'AbortError') setToolMessage('Unable to export this image. Please try Save Image.'); } }
  function showPreview(quality, manual = '') { setBefore(false); v.generate(quality, manual); }
  return <div className={`visualizer-app ${toolsOpen?'with-tools':''}`}>
    <h1 className="sr-only" tabIndex={-1}>Design Visualizer</h1>
    <div className="viz-toolbar"><div className="chips" role="group" aria-label="Project type">
      {['kitchen','exterior'].map(mode => <button {...unlock} key={mode} className={`chip ${v.design.mode === mode ? 'selected' : ''}`} aria-pressed={v.design.mode === mode} disabled={v.busy} onClick={event => { if (!unlock.onClick(event)) switchMode(mode); }}>{mode === 'kitchen' ? 'Kitchen & Cabinets' : 'Home Exterior'}</button>)}
    </div></div>
    {toolsOpen && <section className="viz-tools" aria-label="Consultation tools">
      <div className="viz-tools-heading"><h2>Consultation Tools</h2><button className="button" onClick={closeTools}>Close Tools</button></div>
      <VisualizerConnection connected={connected} online={online} onConnected={data => {setConnected(true);setOperatorReady(Boolean(data.operatorAuthorized));setToolMessage('');}} onForgotten={() => {setConnected(false);setOperatorReady(false);setCustomPrompt('');setToolMessage('');}} />
      <div className="viz-actions"><button className="button" onClick={loadSaved}>Saved Previews on This Tablet</button></div>
      <p role="status">{toolMessage}</p>
      {!!saved.length && <div className="viz-saved-list">{saved.map(record => <SavedThumb key={record.id} record={record} onSelect={r => { setArchived(r); setBefore(false); }} />)}</div>}
      {archived && <div className="viz-actions"><button className="button" onClick={() => setArchived(null)}>Back to Current Consultation</button><button className="button" onClick={removeSaved}>Delete Selected Preview</button></div>}
      <div className="viz-custom-prompt"><h3>Custom Design Instructions</h3><p>Render the selected photo with your specific changes. Each button creates one image using the normal usage allowance.</p>
      {!operatorReady && <p>Activate this tablet with your password to enable custom instructions.</p>}
      <label className="viz-label">Custom Instructions<textarea maxLength={1500} rows={4} value={customPrompt} disabled={!operatorReady || v.busy} onChange={e => setCustomPrompt(e.target.value)} placeholder="For example: Keep the upper cabinets white and make only the island a muted sage green. Keep the countertop unchanged." /></label>
      <small>{customPrompt.length} / 1,500 characters</small><div className="viz-actions"><button className="button button-dark" disabled={!operatorReady || !connected || !online || !v.photo || v.busy || loadingPhoto || !!archived || !customPrompt.trim()} onClick={() => showPreview('preview',customPrompt)}>Create Custom Preview</button><button className="button" disabled={!operatorReady || !connected || !online || !v.photo || v.busy || loadingPhoto || !!archived || !customPrompt.trim()} onClick={() => showPreview('detail',customPrompt)}>Create Detailed Custom Preview</button></div></div>
        <label className="viz-label">Consultation Label <span>(Optional)</span><input value={v.label} maxLength={100} placeholder="For finding these previews later" onChange={e => v.setLabel(e.target.value)} /></label>
        <button className="viz-text-button" disabled={v.busy} onClick={() => { if (!v.photo || window.confirm('Start a new consultation? Saved previews will stay on this tablet.')) { photoEpoch.current += 1; v.reset(); setArchived(null); setSaved([]); setToolsOpen(false); setCustomPrompt(''); setToolMessage(''); setBefore(false); setLoadingPhoto(false); setSurface('siding'); setTone('light'); setPaletteSession(n=>n+1); } }}>Start a New Consultation</button>
    </section>}
    <div className="viz-workspace">
      <section className="viz-canvas-column" aria-label="Your design preview">
        <div className="viz-photo-stage">
          {originalUrl ? <img src={current && !before ? previewUrl : originalUrl} alt={current && !before ? 'AI design preview of the selected finishes' : 'Original photo of your home'} /> : <div className="viz-upload-intro"><button className="button button-dark" onClick={() => cameraInput.current?.click()}>Take a Photo</button><button className="button" onClick={() => fileInput.current?.click()}>Choose Photos</button></div>}
          {current && <span className="viz-save-status">{current.saved === false ? 'Not Yet Saved' : 'Saved on This Tablet'}</span>}
          {v.busy && <div className="viz-working" role="status"><span className="viz-spinner" /><strong>Creating Your Preview</strong><span>{elapsed}s elapsed · You can browse the portfolio while we work.</span><button onClick={v.cancel}>Stop Waiting</button></div>}
        </div>
        <input className="sr-only" ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="Choose home photo" onChange={e => { upload(e.target.files); e.target.value = ''; }} />
        <input className="sr-only" ref={cameraInput} type="file" accept="image/*" capture="environment" aria-label="Take home photo" onChange={e => { upload(Array.from(e.target.files || [])); e.target.value = ''; }} />
        {loadingPhoto && <p role="status">Preparing Your Photo…</p>}
        <VisualizerPhotos photos={v.photos} photoId={v.photo?.id} disabled={v.busy || loadingPhoto} onSelect={id => { v.selectPhoto(id); setArchived(null); setBefore(false); }} />
        <div className="viz-actions">
        {v.photo && !archived && <button className="button" disabled={v.busy || loadingPhoto} onClick={() => fileInput.current?.click()}>Add Photos</button>}
        {originalUrl && <button className="button" onClick={() => setFullscreen(true)}>View Fullscreen</button>}
          {current && <button className="button" aria-label={before ? 'Show Design Preview' : 'Show Original'} aria-pressed={before} onClick={() => setBefore(!before)}>{before ? 'After' : 'Before'}</button>}
        </div>
        {v.saveWarning && <p className="viz-error" role="alert">{v.saveWarning}</p>}
        {(toolsOpen || v.saveWarning) && current && <div className="viz-actions"><button className="button" onClick={() => exportCurrent(false)}>Save Image</button><button className="button" onClick={() => exportCurrent(true)}>Share Image</button></div>}
        {!!angleLooks.length && <div className="viz-look-strip" aria-label="This consultation’s previews">{angleLooks.map((record,i) => <button key={record.id} className={`chip ${v.selectedId === record.id && !archived ? 'selected' : ''}`} aria-pressed={v.selectedId === record.id && !archived} onClick={() => { v.setSelectedId(record.id); setArchived(null); setBefore(false); }}>Look {angleLooks.length-i}</button>)}</div>}
      </section>
      <section className="viz-controls" id="visualizer-finishes" aria-label="Choose your finishes">
        <h2 className="sr-only">Choose Your Finishes</h2>
        {v.design.mode === 'kitchen' ? <VisualizerCabinets layout={layout} tone={tone} light={colors.find(c=>c.id===tones.light)} dark={colors.find(c=>c.id===tones.dark)} onLayout={changeLayout} onTone={setTone} disabled={v.busy}/>
          : <VisualizerExteriorSteps active={activeSurface} surfaces={v.design.surfaces} onSelect={setSurface} disabled={v.busy}/>}
        {!twoTone && <div className="viz-selection"><div>{v.design.mode==='exterior' && <span>{surfaceNames[activeSurface]}</span>}<strong>{selectedColor?.name || 'Keep Existing Finish'}</strong></div><button className="viz-text-button" disabled={v.busy} onClick={()=>setColor('')}>Keep Existing</button></div>}
        <VisualizerPalette key={paletteSession} collection={collection} selectedId={selectedColor?.id} onSelect={setColor} disabled={v.busy} target={surfaceNames[activeSurface]}/>
        {v.design.mode === 'kitchen' && <VisualizerOptions design={v.design} onChange={v.setDesign} disabled={v.busy}/>}
        {!online && <p className="viz-notice">Connect to the internet to create a new preview. Saved images and color selections still work offline.</p>}
        {!connected && online && <p className="viz-notice">Ask your representative to connect this tablet.</p>}
        {v.error && <p className="viz-error" role="alert">{v.error}</p>}
        <div className="viz-generate"><button className="button button-dark" disabled={!v.photo || !hasChanges || !connected || !online || v.busy || loadingPhoto || !!archived} onClick={() => showPreview('preview')}>{v.busy ? 'Creating Preview…' : 'Create My Preview'}</button><button className="button" disabled={!v.photo || !hasChanges || !connected || !online || v.busy || loadingPhoto || !!archived} onClick={() => showPreview('detail')}>Create Detailed Preview</button></div>
      </section>
    </div>
    <dialog className="viz-fullscreen" ref={fullscreenDialog} onCancel={() => setFullscreen(false)} onClose={() => setFullscreen(false)} aria-label="Fullscreen design photo"><button className="button" autoFocus onClick={() => setFullscreen(false)}>Close Fullscreen</button><img src={current && !before ? previewUrl : originalUrl} alt={current && !before ? 'Design preview fullscreen' : 'Original home photo fullscreen'} /></dialog>
  </div>;
}
