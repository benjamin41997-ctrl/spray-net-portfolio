import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { callVisualizer, connectionSettings, imageDataBlob } from '../lib/visualizerClient';
import { saveRender } from '../lib/visualizerStorage';

const Context = createContext(null);
export const useVisualizer = () => useContext(Context);
export const newDesign = (mode = 'kitchen') => ({ mode, sidingMaterial: 'auto', surfaces: {}, hardwareStyle: 'keep', hardwareFinish: 'keep', backsplash: 'keep', countertop: 'keep' });
export default function VisualizerProvider({ children }) {
  const [photos, setPhotos] = useState([]);
  const [photoId, setPhotoId] = useState(null);
  const photo = photos.find(item => item.id === photoId) || null;
  const [design, setDesign] = useState(newDesign);
  const [looks, setLooks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const controller = useRef(null);
  const epoch = useRef(0);
  const reset = () => {
    epoch.current += 1; controller.current?.abort(); controller.current = null;
    setPhotos([]); setPhotoId(null); setDesign(newDesign()); setLooks([]); setSelectedId(null); setLabel(''); setBusy(false); setError(''); setSaveWarning('');
  };
  useEffect(() => {
    window.addEventListener('portfolio-session-reset', reset);
    return () => { window.removeEventListener('portfolio-session-reset', reset); controller.current?.abort(); };
  }, []);
  const addPhotos = (next) => {
    if (controller.current || !next.length) return;
    const added = next.map(item => ({ ...item, id:crypto.randomUUID() }));
    setPhotos(current => [...current, ...added]);
    if (!photoId) { setPhotoId(added[0].id); setSelectedId(null); }
    setError(''); setSaveWarning('');
  };
  const selectPhoto = (id) => {
    if (controller.current) return;
    setPhotoId(id); setSelectedId(looks.find(item => item.photoId === id)?.id || null); setError(''); setSaveWarning('');
  };
  async function generate(quality, customPrompt = '') {
    if (!photo || controller.current) return;
    const generation = epoch.current;
    const abort = new AbortController(); controller.current = abort;
    const timer = setTimeout(() => abort.abort('timeout'), 270_000);
    setBusy(true); setError(''); setSaveWarning('');
    try {
      const submittedDesign = { ...design, surfaces: Object.fromEntries(Object.entries(design.surfaces).filter(([, value]) => value)) };
      const manual = customPrompt.trim();
      const data = await callVisualizer('/api/render', { ...connectionSettings(), signal: abort.signal, body: { image: photo.dataUrl, design: submittedDesign, quality, ...(manual ? {customPrompt:manual} : {}) } });
      const {labelRender}=await import('../lib/renderLabel');
      const finalDesign=structuredClone({...submittedDesign,...(manual?{customPrompt:manual}:{})});
      const renderPhoto = await labelRender(imageDataBlob(data.image),finalDesign);
      if (epoch.current !== generation) return;
      const record = { id: crypto.randomUUID(), photoId:photo.id, originalPhoto: photo.blob, renderPhoto, design: structuredClone({...submittedDesign,...(manual ? {customPrompt:manual} : {})}), consultationLabel: label.trim() || `Consultation ${new Date().toLocaleString()}`, createdAt: new Date().toISOString(), model: data.model, quality };
      let saved = false;
      try { await saveRender(record); saved = true; }
      catch (e) { if (epoch.current === generation) setSaveWarning(e.message || 'This preview could not be saved on this tablet. Use Save Image before leaving.'); }
      if (epoch.current !== generation) return;
      setLooks(current => [{ ...record, saved }, ...current]); setSelectedId(record.id);
    } catch (e) {
      if (epoch.current === generation) setError(abort.signal.aborted ? 'Rendering stopped. If it had already started, the image service may still charge for it. You can try again when ready.' : (e.message || 'Unable to reach the image service. Check your connection.'));
    } finally {
      clearTimeout(timer);
      if (epoch.current === generation) { setBusy(false); controller.current = null; }
    }
  }
  return <Context.Provider value={{ photo, photos, addPhotos, selectPhoto, design, setDesign, looks, selectedId, setSelectedId, label, setLabel, busy, error, setError, saveWarning, generate, reset, cancel: () => controller.current?.abort() }}>{children}</Context.Provider>;
}
