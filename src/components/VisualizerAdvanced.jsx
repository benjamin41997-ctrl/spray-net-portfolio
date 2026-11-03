import {useEffect,useState} from 'react';
import {viewSuggestions} from '../lib/photoViews';

export default function VisualizerAdvanced({photo,name,prompt,onPrompt,onSubmit,onExit,onRename,disabled,canRender}) {
  const [view,setView]=useState(photo?.viewLabel || '');const [message,setMessage]=useState('');const [saving,setSaving]=useState(false);
  useEffect(()=>{setView(photo?.viewLabel || '');setMessage('');},[photo?.id,photo?.viewLabel]);
  async function rename(){setSaving(true);setMessage('');try{await onRename(view);setMessage('View Name Saved');}catch(e){setMessage(e.message);}finally{setSaving(false);}}
  return <section className="viz-advanced-panel" aria-label="Advanced design instructions">
    <div className="viz-advanced-heading"><h3>Custom Design Instructions</h3><button className="viz-text-button" disabled={disabled} onClick={onExit}>Turn Off Advanced Mode</button></div>
    <p className="viz-editing-image">{photo?`Editing: ${name}`:'Choose a photo to start.'}</p>
    <div className="viz-view-editor"><label className="viz-label">Photo View<input list="photo-view-names" maxLength={60} value={view} disabled={!photo || disabled || saving} onChange={e=>setView(e.target.value)} placeholder="Sink & Dishwasher View"/></label><button className="button" disabled={!photo || disabled || saving || !view.trim() || view.trim()===photo.viewLabel} onClick={rename}>Save View Name</button></div>
    <datalist id="photo-view-names">{viewSuggestions.map(view=><option value={view} key={view}/>)}</datalist>
    <label className="viz-label">Custom Instructions<textarea aria-label="Custom Instructions" rows={3} maxLength={1500} value={prompt} disabled={disabled || !photo} onChange={e=>onPrompt(e.target.value)} placeholder="Describe what to change in the selected image and what to keep."/></label>
    <small>{prompt.length} / 1,500 characters. Each action creates one new image.</small>
    <div className="viz-actions"><button className="button button-dark" disabled={!canRender || !prompt.trim()} onClick={()=>onSubmit('preview')}>Create Custom Preview</button><button className="button" disabled={!canRender || !prompt.trim()} onClick={()=>onSubmit('detail')}>Create Detailed Custom Preview</button></div>
    {message && <p role="status">{message}</p>}
  </section>;
}
