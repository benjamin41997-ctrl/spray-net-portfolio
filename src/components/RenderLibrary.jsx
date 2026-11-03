import {useEffect,useState} from 'react';
import {renderName,renderDetails} from '../lib/renderNames';
import {emailRenders} from '../lib/renderSharing';

function RenderCard({record,selected,disabled,onToggle,onDelete}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{const next=URL.createObjectURL(record.renderPhoto);setUrl(next);return()=>URL.revokeObjectURL(next);},[record.renderPhoto]);
  const name=renderName(record);
  return <article className="viz-render-card">
    <label><img src={url} alt={`${name} design`} /><span><input type="checkbox" aria-label={`Select ${name}`} checked={selected} disabled={disabled} onChange={onToggle}/>{name}</span></label>
    {renderDetails(record) && <small className="viz-render-finishes">{renderDetails(record)}</small>}
    <small>{record.consultationLabel || 'Current Consultation'} · {new Date(record.createdAt).toLocaleString()}</small>
    <button className="button" disabled={disabled} onClick={onDelete} aria-label={`Delete ${name}`}>Delete Preview</button>
  </article>;
}

export default function RenderLibrary({records,busy,operatorReady,onDelete}) {
  const [selected,setSelected]=useState([]);const [working,setWorking]=useState(false);const [message,setMessage]=useState('');
  const chosen=records.filter(r=>selected.includes(r.id));
  const disabled=busy || working || !operatorReady;
  function share(){
    setMessage('');
    try{
      // Do not await any work before opening the native share sheet.
      const result=emailRenders(chosen);setWorking(true);
      result.then(()=>setMessage('Choose your Spray-Net account in your email app, write your message, and send when ready.')).catch(e=>{if(e.name!=='AbortError')setMessage(e.message || 'Unable to open your email app. Try fewer previews.');}).finally(()=>setWorking(false));
    }catch(e){setMessage(e.message);}
  }
  async function remove(record){
    if(!window.confirm('Permanently delete this preview? Shared previews will be removed from both tablets. The original photo will stay saved.'))return;
    setWorking(true);setMessage('');
    try{await onDelete(record);setSelected(current=>current.filter(id=>id!==record.id));setMessage('Preview Deleted');}catch(e){setMessage(e.message);}finally{setWorking(false);}
  }
  return <section className="viz-render-library" aria-label="Manage previews">
    <h3>Send & Manage Previews</h3>
    <p>Select previews, then tap Email Selected and choose Outlook. Your email app opens with the images attached. Use your Spray-Net account to write and send your message.</p>
    <div className="viz-actions">
      <button className="button" disabled={disabled || !records.length} onClick={()=>setSelected(records.map(r=>r.id))}>Select All Previews</button>
      <button className="button" disabled={disabled || !chosen.length} onClick={()=>setSelected([])}>Clear Selection</button>
      <button className="button button-dark" disabled={disabled || !chosen.length} onClick={share}>Email Selected ({chosen.length})</button>
    </div>
    <p role="status">{message}</p>
    {!records.length?<p>Your saved previews will appear here. Open a saved consultation to send its previews.</p>:<div className="viz-render-grid">{records.map(record=><RenderCard key={record.id} record={record} selected={selected.includes(record.id)} disabled={disabled} onToggle={()=>setSelected(current=>current.includes(record.id)?current.filter(id=>id!==record.id):[...current,record.id])} onDelete={()=>remove(record)}/>)}</div>}
  </section>;
}
