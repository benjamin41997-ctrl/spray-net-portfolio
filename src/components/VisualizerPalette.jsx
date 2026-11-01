import { useEffect, useMemo, useState } from 'react';

export default function VisualizerPalette({collection, selectedId, onSelect, disabled, target}) {
  const [search,setSearch]=useState('');const [family,setFamily]=useState('All');const [brand,setBrand]=useState('All');const [shown,setShown]=useState(36);
  useEffect(()=>{setSearch('');},[target]);
  useEffect(()=>{setShown(36);},[search,family,brand,target]);
  const matching=useMemo(()=>collection.filter(c=>(family==='All'||c.family===family)&&(brand==='All'||c.brand===brand)&&`${c.name} ${c.code}`.toLowerCase().replace(/[^a-z0-9]/g,'').includes(search.trim().toLowerCase().replace(/[^a-z0-9]/g,''))),[collection,family,brand,search]);
  return <>
    <div className="viz-palette-tools">
      <label><span className="sr-only">Find a Color</span><input type="search" placeholder="Find a Color" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <label><span className="sr-only">Color Family</span><select aria-label="Color Family" value={family} onChange={e=>setFamily(e.target.value)}><option value="All">All Colors</option>{[...new Set(collection.map(c=>c.family))].sort().map(f=><option key={f}>{f}</option>)}</select></label>
      <label><span className="sr-only">Color Collection</span><select aria-label="Color Collection" value={brand} onChange={e=>setBrand(e.target.value)}><option value="All">All Collections</option>{[...new Set(collection.map(c=>c.brand))].sort().map(b=><option key={b}>{b}</option>)}</select></label>
    </div>
    <div className="viz-swatches" aria-label={`Colors for ${target}`}>
      {matching.slice(0,shown).map(c=><button disabled={disabled} aria-pressed={selectedId===c.id} className={`viz-swatch ${selectedId===c.id?'selected':''}`} key={c.id} onClick={()=>onSelect(c.id)} title={`${c.brand} ${c.name} ${c.code}`}><span className="viz-color-chip" style={{background:c.hex || '#eee'}}/><strong>{c.name}</strong><small>{c.code}</small></button>)}
      {!matching.length && <p className="viz-palette-empty" role="status">No matching colors. Try another name or filter.</p>}
      {matching.length>shown && <button className="button viz-more" onClick={()=>setShown(n=>n+36)}>Show More Colors</button>}
    </div>
  </>;
}
