import {useState} from 'react';

export default function ConsultationLibrary({sync,busy,onOpened}) {
  const [name,setName]=useState('');const [library,setLibrary]=useState([]);const [search,setSearch]=useState('');const [message,setMessage]=useState('');const [working,setWorking]=useState(false);
  async function action(fn){if(working)return;setWorking(true);setMessage('');try{await fn();}catch(e){setMessage(e.message);}finally{setWorking(false);}}
  const disabled=busy || working;
  return <section className="viz-consultation-library" aria-label="Saved consultations">
    <h3>Shared Consultations</h3>
    <p>{sync.session?<><strong>{sync.session.name}</strong><br/>Customer session clears at {new Date(sync.session.expiresAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}. Its photos and previews remain saved.</>:'Start a named consultation here, or upload photos to start one automatically. Both activated tablets follow the same customer session.'}</p>
    <label className="viz-label">Consultation Name<input value={name} maxLength={160} onChange={e=>setName(e.target.value)} placeholder="For example: Smith Kitchen - November 1"/></label>
    <div className="viz-actions">
      <button className="button button-dark" disabled={disabled} onClick={()=>action(async()=>{await sync.startNew(name);setName('');onOpened();})}>Start a New Consultation</button>
      {sync.session && <button className="button" disabled={disabled || !name.trim()} onClick={()=>action(async()=>{await sync.rename(name);setName('');})}>Rename Current Consultation</button>}
      <button className="button" disabled={disabled} onClick={()=>action(async()=>setLibrary(await sync.list()))}>Saved Consultations</button>
      {sync.session && <button className="button" disabled={disabled} onClick={()=>action(()=>sync.end())}>End Customer Session</button>}
      <button className="button" disabled={disabled} onClick={()=>action(()=>sync.retry())}>Retry Sync</button>
    </div>
    <p role="status">{message || sync.status}{sync.pending>0?` (${sync.pending} waiting to sync)`:''}</p>
    {!!library.length && <><label className="viz-label">Find a Consultation<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name"/></label><div className="viz-consultation-list">{library.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())).map(c=><article key={c.id}><div><strong>{c.name}</strong><small>{new Date(c.updatedAt).toLocaleDateString()} · {c.photoCount} photos · {c.renderCount} previews</small></div><button className="button" disabled={disabled} onClick={()=>action(async()=>{await sync.activate(c.id);onOpened();})} aria-label={`Open Consultation ${c.name}`}>Open</button><button className="viz-text-button" disabled={disabled} onClick={()=>{if(window.confirm(`Permanently delete ${c.name} and its shared photos and previews?`))action(async()=>{await sync.remove(c.id);setLibrary(await sync.list());});}} aria-label={`Delete Consultation ${c.name}`}>Delete</button></article>)}</div></>}
    <p className="viz-consultation-help">Open a saved consultation to create more previews or use Save Image / Share Image for follow-up. Internet is required to sync between tablets.</p>
  </section>;
}
