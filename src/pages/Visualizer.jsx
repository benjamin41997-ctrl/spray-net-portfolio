import { useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Icon from '../components/Icon';
import { newDesign, useVisualizer } from '../components/VisualizerProvider';
import { colors } from '../data/colors';
import { useOnline } from '../hooks/useOnline';
import { preparePhoto } from '../lib/visualizerPhoto';
import { listRenders, deleteRender } from '../lib/visualizerStorage';
import { callVisualizer, connectionSettings, saveConnection, forgetConnection } from '../lib/visualizerClient';
import { navigate } from '../lib/navigation';

const surfaceNames = { cabinets: 'All Cabinets', upperCabinets: 'Upper Cabinets', lowerCabinets: 'Lower Cabinets', island: 'Island', siding: 'Siding', brick: 'Brick', stucco: 'Stucco', frontDoor: 'Front Door', garageDoor: 'Garage Door', windows: 'Window Frames', soffits: 'Soffits', fascia: 'Fascia', vents: 'Vents', columns: 'Columns', trim: 'Trim' };
const exteriorSurfaces = ['siding', 'brick', 'stucco', 'frontDoor', 'garageDoor', 'windows', 'soffits', 'fascia', 'vents', 'columns', 'trim'];
const extras = {
  hardwareStyle: { label: 'Hardware Style', options: { keep: 'Keep Existing', bar: 'Bar Pulls', knob: 'Knobs', cup: 'Cup Pulls', none: 'No Hardware' } },
  hardwareFinish: { label: 'Hardware Finish', options: { keep: 'Keep Existing', 'matte-black': 'Matte Black', 'brushed-nickel': 'Brushed Nickel', brass: 'Brass', chrome: 'Chrome', bronze: 'Bronze' } },
  backsplash: { label: 'Backsplash', options: { keep: 'Keep Existing', 'white-subway': 'White Subway Tile', marble: 'Marble Look', 'warm-neutral': 'Warm Neutral Tile' } },
  countertop: { label: 'Countertops', options: { keep: 'Keep Existing', 'white-quartz': 'White Quartz Look', marble: 'Marble Look', 'dark-stone': 'Dark Stone Look', 'butcher-block': 'Butcher Block Look' } },
};
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
  const [search, setSearch] = useState(''); const [family, setFamily] = useState('All');
  const [brand, setBrand] = useState('All'); const [shown, setShown] = useState(36);
  const [toolsOpen, setToolsOpen] = useState(false); const [settings, setSettings] = useState(connectionSettings);
  const [connected, setConnected] = useState(false); const [connecting, setConnecting] = useState(false);
  const [toolMessage, setToolMessage] = useState(''); const [saved, setSaved] = useState([]); const [archived, setArchived] = useState(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false); const [before, setBefore] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenDialog = useRef(null);
  const fileInput = useRef(null); const cameraInput = useRef(null); const connectionInput = useRef(null); const photoEpoch = useRef(0);
  const current = archived || v.looks.find(r => r.id === v.selectedId);
  const previewUrl = useBlobUrl(current?.renderPhoto); const originalUrl = useBlobUrl(archived?.originalPhoto || v.photo?.blob);
  const [elapsed, setElapsed] = useState(0);
  const pairingCode = useRef(new URLSearchParams(window.location.hash.split('?')[1] || '').get('tablet'));
  useEffect(() => { if (!v.busy) { setElapsed(0); return; } const started = Date.now(); const timer = setInterval(() => setElapsed(Math.floor((Date.now()-started)/1000)), 1000); return () => clearInterval(timer); }, [v.busy]);
  useEffect(() => { let active = true; const c = connectionSettings(); if (c.endpoint && c.token && online) callVisualizer('/api/session', { ...c, signal: AbortSignal.timeout(10_000) }).then(() => active && setConnected(true)).catch(() => active && setConnected(false)); return () => { active = false; }; }, [online]);
  useEffect(() => {
    const code = pairingCode.current;
    if (!code) return;
    navigate('/visualize', { replace: true });
    let active = true;
    async function pair() {
      setConnecting(true);
      try {
        if (code.length > 2048) throw new Error('This tablet setup link is invalid.');
        const parsed = JSON.parse(atob(code.replace(/-/g,'+').replace(/_/g,'/')));
        if (typeof parsed.endpoint !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(parsed.token || '')) throw new Error('This tablet setup link is invalid.');
        await callVisualizer('/api/session', { ...parsed, signal: AbortSignal.timeout(15_000) });
        if (!active) return;
        saveConnection(parsed.endpoint, parsed.token); setSettings(parsed); setConnected(true); setToolMessage('This tablet is connected.');
      } catch (e) { if (active) { setToolsOpen(true); setToolMessage(e.message || 'Unable to connect this tablet.'); } }
      finally { if (active) setConnecting(false); }
    }
    pair(); return () => { active = false; };
  }, []);
  useEffect(() => { setShown(36); }, [search, family, brand, v.design.mode]);
  useEffect(() => () => { photoEpoch.current += 1; }, []);
  useEffect(() => { if (fullscreen) fullscreenDialog.current?.showModal(); else fullscreenDialog.current?.close(); }, [fullscreen]);
  const twoTone = Object.hasOwn(v.design.surfaces, 'upperCabinets') || Object.hasOwn(v.design.surfaces, 'lowerCabinets');
  const surfaces = v.design.mode === 'exterior' ? exteriorSurfaces : (twoTone ? ['upperCabinets', 'lowerCabinets', 'island'] : ['cabinets', 'island']);
  const activeSurface = surfaces.includes(surface) ? surface : surfaces[0];
  const collection = useMemo(() => {
    const systems = v.design.mode === 'kitchen' ? ['kitchen'] : ({ brick:['brick'], stucco:['elasto'], frontDoor:['dw'], garageDoor:['dw'], windows:['dw'], siding: v.design.sidingMaterial === 'vinyl' ? ['vinyl'] : ['mat','satin'] }[activeSurface] || ['mat','satin','dw']);
    return colors.filter(c => c.systems.some(system => systems.includes(system)));
  }, [v.design.mode, v.design.sidingMaterial, activeSurface]);
  const matching = useMemo(() => collection.filter(c => (family === 'All' || c.family === family) && (brand === 'All' || c.brand === brand) && `${c.name} ${c.code}`.toLowerCase().includes(search.trim().toLowerCase())), [collection, family, brand, search]);
  const selectedColor = colors.find(c => c.id === v.design.surfaces[activeSurface]);
  const changes = Object.entries(v.design.surfaces).filter(([,value]) => value);
  const hasChanges = changes.length > 0 || Object.keys(extras).some(key => v.design[key] !== 'keep');
  const setColor = (id) => v.setDesign(d => ({ ...d, surfaces: { ...d.surfaces, [activeSurface]: id } }));
  async function upload(file) {
    if (!file) return; const epoch = ++photoEpoch.current;
    setLoadingPhoto(true); v.setError('');
    try { const next = await preparePhoto(file); if (epoch !== photoEpoch.current) return; v.choosePhoto(next); setArchived(null); setBefore(false); }
    catch (e) { if (epoch === photoEpoch.current) v.setError(e.message); }
    finally { if (epoch === photoEpoch.current) setLoadingPhoto(false); }
  }
  function switchMode(mode) { if (mode === v.design.mode) return; v.setDesign(newDesign(mode)); setSurface(mode === 'kitchen' ? 'cabinets' : 'siding'); setSearch(''); setFamily('All'); setBrand('All'); }
  function changeLayout(split) { if (split === twoTone) return; v.setDesign(d => { const next = { ...d.surfaces }; delete next.cabinets; delete next.upperCabinets; delete next.lowerCabinets; if (split) { next.upperCabinets = ''; next.lowerCabinets = ''; } return { ...d, surfaces: next }; }); setSurface(split ? 'upperCabinets' : 'cabinets'); }
  async function connect(event, next = settings) {
    event?.preventDefault(); setConnecting(true); setToolMessage('');
    try { await callVisualizer('/api/session', { ...next, token: next.token.trim(), signal: AbortSignal.timeout(15_000) }); saveConnection(next.endpoint, next.token); setSettings(next); setConnected(true); setToolMessage('Connected. This tablet is ready to create previews.'); }
    catch (e) { setConnected(false); setToolMessage(e.message || 'Unable to connect. Check the service address and access code.'); }
    finally { setConnecting(false); }
  }
  async function importConnection(file) {
    try {
      if (!file || file.size > 4096) throw new Error('Choose your small tablet-connection.json setup file.');
      const next = JSON.parse(await file.text());
      if (typeof next.endpoint !== 'string' || !/^[A-Za-z0-9_-]{43,128}$/.test(next.token || '')) throw new Error('This is not a valid tablet connection file.');
      await connect(null, { endpoint:next.endpoint, token:next.token });
    } catch(e) { setToolMessage(e.message || 'Unable to read the connection file.'); }
  }
  async function loadSaved() { const epoch = photoEpoch.current; try { const records = await listRenders(); if (epoch !== photoEpoch.current) return; setSaved(records); setToolMessage('Saved previews are stored on this device only.'); } catch(e) { if (epoch === photoEpoch.current) setToolMessage(e.message); } }
  async function removeSaved() { if (!archived || !window.confirm('Delete this saved preview from this tablet?')) return; try { await deleteRender(archived.id); setArchived(null); await loadSaved(); } catch(e) { setToolMessage(e.message); } }
  async function exportCurrent(share) { try { await exportImage(current, share); } catch(e) { if(e.name !== 'AbortError') setToolMessage('Unable to export this image. Please try Save Image.'); } }
  function showPreview(quality) {
    setBefore(false); v.generate(quality);
    if (window.innerWidth <= 1000) document.querySelector('.viz-photo-stage')?.scrollIntoView({ block:'start', behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  return <>
    <PageHeader eyebrow="IMAGINE THE POSSIBILITIES" title="Your Home. Your Colors." description="Start with a photo. Choose a finish. See a new possibility." />
    <div className="viz-toolbar"><div className="chips" role="group" aria-label="Project type">
      {['kitchen','exterior'].map(mode => <button key={mode} className={`chip ${v.design.mode === mode ? 'selected' : ''}`} aria-pressed={v.design.mode === mode} disabled={v.busy} onClick={() => switchMode(mode)}>{mode === 'kitchen' ? 'Kitchen & Cabinets' : 'Home Exterior'}</button>)}
    </div><button className="viz-text-button" onClick={() => setToolsOpen(!toolsOpen)} aria-expanded={toolsOpen}>Consultation Tools</button></div>
    {toolsOpen && <section className="viz-tools" aria-label="Consultation tools">
      <h2>Consultation Tools</h2><p>Connect this tablet once per browser session. Your OpenAI key stays on the server.</p>
      <form onSubmit={connect} className="viz-connect"><label>Image Service Address<input type="url" value={settings.endpoint} required placeholder="https://your-image-service.example" onChange={e => setSettings(s => ({...s, endpoint:e.target.value}))} /></label><label>Tablet Access Code<input type="password" autoComplete="off" value={settings.token} required onChange={e => setSettings(s => ({...s, token:e.target.value}))} /></label><button className="button button-dark" disabled={connecting || !online}>{connecting ? 'Connecting…' : 'Connect Tablet'}</button></form>
      <div className="viz-actions"><button className="button" disabled={connecting || !online} onClick={() => connectionInput.current?.click()}>Connect From Setup File</button><button className="button" onClick={loadSaved}>Saved Previews on This Tablet</button><button className="button" onClick={() => { forgetConnection(); setConnected(false); setSettings(s => ({ ...s, token:'' })); setToolMessage('Tablet disconnected. Saved images remain on this device.'); }}>Disconnect</button></div>
      <input className="sr-only" ref={connectionInput} type="file" accept="application/json,.json" aria-label="Tablet connection setup file" onChange={e => { importConnection(e.target.files?.[0]); e.target.value=''; }} />
      <p role="status">{toolMessage}</p>
      {!!saved.length && <div className="viz-saved-list">{saved.map(record => <SavedThumb key={record.id} record={record} onSelect={r => { setArchived(r); setBefore(false); }} />)}</div>}
      {archived && <div className="viz-actions"><button className="button" onClick={() => setArchived(null)}>Back to Current Consultation</button><button className="button" onClick={removeSaved}>Delete Selected Preview</button></div>}
    </section>}
    <div className="viz-workspace">
      <section className="viz-canvas-column" aria-label="Your design preview">
        <div className="viz-photo-stage">
          {originalUrl ? <img src={current && !before ? previewUrl : originalUrl} alt={current && !before ? 'AI design preview of the selected finishes' : 'Original photo of your home'} /> : <div className="viz-upload-intro"><Icon name="sparkles" size={42} /><h2>Picture Your Transformation</h2><p>A clear, well-lit photo works best. Include the full kitchen or the surfaces you want to change.</p><button className="button button-dark" onClick={() => cameraInput.current?.click()}>Take a Photo</button><button className="button" onClick={() => fileInput.current?.click()}>Choose a Photo</button></div>}
          {v.busy && <div className="viz-working" role="status"><span className="viz-spinner" /><strong>Creating Your Preview</strong><span>{elapsed}s elapsed · You can browse the portfolio while we work.</span><button onClick={v.cancel}>Stop Waiting</button></div>}
        </div>
        <input className="sr-only" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" aria-label="Choose home photo" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        <input className="sr-only" ref={cameraInput} type="file" accept="image/*" capture="environment" aria-label="Take home photo" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} />
        {loadingPhoto && <p role="status">Preparing Your Photo…</p>}
        <div className="viz-actions">
        {v.photo && !archived && <button className="button" disabled={v.busy} onClick={() => fileInput.current?.click()}>Change Photo</button>}
          {v.photo && !archived && <button className="button viz-choose-colors" disabled={v.busy} onClick={() => document.getElementById('visualizer-finishes')?.scrollIntoView({ block:'start', behavior:'smooth' })}>Choose Colors</button>}
        {originalUrl && <button className="button" onClick={() => setFullscreen(true)}>View Fullscreen</button>}
          {current && <><button className="button" aria-pressed={before} onClick={() => setBefore(!before)}>{before ? 'Show Design Preview' : 'Show Original'}</button><span className="viz-save-status">{current.saved === false ? 'Not Yet Saved' : 'Saved on This Tablet'}</span></>}
        </div>
        {current && <><p className="viz-preview-caption">Design Preview · Confirm colors with physical samples. Hardware, countertop, and backsplash ideas are for visualization.</p><p className="viz-preview-caption">Shown Here: {Object.entries(current.design.surfaces).map(([id,colorId]) => `${surfaceNames[id]} in ${colors.find(c => c.id === colorId)?.name || colorId}`).join(' · ') || 'Selected Hardware and Finishes'}</p></>}
        {v.saveWarning && <p className="viz-error" role="alert">{v.saveWarning}</p>}
        {(toolsOpen || v.saveWarning) && current && <div className="viz-actions"><button className="button" onClick={() => exportCurrent(false)}>Save Image</button><button className="button" onClick={() => exportCurrent(true)}>Share Image</button></div>}
        {!!v.looks.length && <div className="viz-look-strip" aria-label="This consultation’s previews">{v.looks.map((record,i) => <button key={record.id} className={`chip ${v.selectedId === record.id && !archived ? 'selected' : ''}`} aria-pressed={v.selectedId === record.id && !archived} onClick={() => { v.setSelectedId(record.id); setArchived(null); setBefore(false); }}>Look {v.looks.length-i}</button>)}</div>}
        <label className="viz-label">Consultation Label <span>(Optional)</span><input value={v.label} maxLength={100} placeholder="For finding these previews later" onChange={e => v.setLabel(e.target.value)} /></label>
        <button className="viz-text-button" disabled={v.busy} onClick={() => { if (!v.photo || window.confirm('Start a new consultation? Saved previews will stay on this tablet.')) { photoEpoch.current += 1; v.reset(); setArchived(null); setSaved([]); setToolsOpen(false); setToolMessage(''); setBefore(false); setLoadingPhoto(false); setSurface('cabinets'); setSearch(''); setFamily('All'); setBrand('All'); } }}>Start a New Consultation</button>
      </section>
      <section className="viz-controls" id="visualizer-finishes" aria-label="Choose your finishes">
        <h2>Make It Yours</h2>
        {v.design.mode === 'kitchen' && <div className="chips" role="group" aria-label="Cabinet color layout"><button className={`chip ${!twoTone ? 'selected' : ''}`} aria-pressed={!twoTone} disabled={v.busy} onClick={() => changeLayout(false)}>One Color</button><button className={`chip ${twoTone ? 'selected' : ''}`} aria-pressed={twoTone} disabled={v.busy} onClick={() => changeLayout(true)}>Two-Tone</button></div>}
        <label className="viz-label">Choose a Surface<select aria-label="Choose a Surface" value={activeSurface} disabled={v.busy} onChange={e => setSurface(e.target.value)}>{surfaces.map(id => <option key={id} value={id}>{surfaceNames[id]}{v.design.surfaces[id] ? ' • Color Selected' : ''}</option>)}</select></label>
        {v.design.mode === 'exterior' && activeSurface === 'siding' && <label className="viz-label">Siding Material<select aria-label="Siding Material" disabled={v.busy} value={v.design.sidingMaterial} onChange={e => v.setDesign(d => { const next = {...d.surfaces}; delete next.siding; return { ...d, sidingMaterial:e.target.value, surfaces:next }; })}><option value="other">Aluminum, Fiber Cement or Engineered Wood</option><option value="vinyl">Vinyl Siding</option></select></label>}
        <div className="viz-selection"><div><span className="eyebrow">{surfaceNames[activeSurface]}</span><strong>{selectedColor?.name || 'Keep Existing Finish'}</strong>{selectedColor && <small>{selectedColor.brand} · {selectedColor.code}</small>}</div><button className="viz-text-button" disabled={v.busy} onClick={() => setColor('')}>Keep Existing</button></div>
        <label className="viz-label">Find a Color<input type="search" placeholder="Search by color name or code" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <div className="viz-palette-filters"><label>Color Family<select value={family} onChange={e => setFamily(e.target.value)}><option>All</option>{[...new Set(collection.map(c => c.family))].sort().map(f => <option key={f}>{f}</option>)}</select></label><label>Color Collection<select value={brand} onChange={e => setBrand(e.target.value)}><option>All</option>{[...new Set(collection.map(c => c.brand))].sort().map(b => <option key={b}>{b}</option>)}</select></label></div>
        <p className="viz-palette-note">{matching.length.toLocaleString()} colors · Screen swatches are approximate.</p>
        <div className="viz-swatches" aria-label={`Colors for ${surfaceNames[activeSurface]}`}>
          {matching.slice(0,shown).map(c => <button disabled={v.busy} aria-pressed={selectedColor?.id === c.id} className={`viz-swatch ${selectedColor?.id === c.id ? 'selected' : ''}`} key={c.id} onClick={() => setColor(c.id)} title={`${c.brand} ${c.name} ${c.code}`}><span className="viz-color-chip" style={{background:c.hex || 'repeating-linear-gradient(45deg,#eee,#eee 8px,#fff 8px,#fff 16px)'}} /> <strong>{c.name}</strong><small>{c.code}{!c.hex ? ' · Swatch Unavailable' : ''}</small></button>)}
        </div>
        {!matching.length && <p>No matching colors. Try a different name, code, or filter.</p>}
        {matching.length > shown && <button className="button viz-more" onClick={() => setShown(n => n+36)}>Show More Colors</button>}
        {v.design.mode === 'kitchen' && <details className="viz-extras"><summary>Hardware, Backsplash & Countertops</summary><p>Optional design ideas. Everything stays as it is unless you choose a change.</p>{Object.entries(extras).map(([key, item]) => <label className="viz-label" key={key}>{item.label}<select aria-label={item.label} disabled={v.busy || (key === 'hardwareFinish' && v.design.hardwareStyle === 'none')} value={v.design[key]} onChange={e => v.setDesign(d => ({ ...d, [key]:e.target.value, ...(key === 'hardwareStyle' && e.target.value === 'none' ? {hardwareFinish:'keep'} : {}) }))}>{Object.entries(item.options).map(([value,name]) => <option key={value} value={value}>{name}</option>)}</select></label>)}</details>}
        {!!changes.length && <ul className="viz-summary">{changes.map(([id,colorId]) => <li key={id}><strong>{surfaceNames[id]}:</strong> {colors.find(c => c.id === colorId)?.name}</li>)}</ul>}
        {!online && <p className="viz-notice">Connect to the internet to create a new preview. Saved images and color selections still work offline.</p>}
        {!connected && online && <p className="viz-notice">Your representative can connect this tablet using Consultation Tools.</p>}
        {v.error && <p className="viz-error" role="alert">{v.error}</p>}
        <div className="viz-generate"><button className="button button-dark" disabled={!v.photo || !hasChanges || !connected || !online || v.busy || loadingPhoto || !!archived} onClick={() => showPreview('preview')}>{v.busy ? 'Creating Preview…' : 'Create My Preview'}</button><button className="button" disabled={!v.photo || !hasChanges || !connected || !online || v.busy || loadingPhoto || !!archived} onClick={() => showPreview('detail')}>Create Detailed Preview</button><p>Creating a preview sends this photo to our image service. Each result saves on this tablet. Detailed previews take longer.</p></div>
      </section>
    </div>
    <dialog className="viz-fullscreen" ref={fullscreenDialog} onCancel={() => setFullscreen(false)} onClose={() => setFullscreen(false)} aria-label="Fullscreen design photo"><button className="button" autoFocus onClick={() => setFullscreen(false)}>Close Fullscreen</button><img src={current && !before ? previewUrl : originalUrl} alt={current && !before ? 'Design preview fullscreen' : 'Original home photo fullscreen'} /></dialog>
  </>;
}
