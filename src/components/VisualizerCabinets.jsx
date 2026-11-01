export default function VisualizerCabinets({layout, tone, light, dark, onLayout, onTone, disabled}) {
  const twoTone=layout!=='one-tone';
  return <div className="viz-cabinet-layout">
    <div className="viz-layout-row">
      <div className="chips" role="group" aria-label="Cabinet color layout">
        <button className={`chip ${!twoTone?'selected':''}`} aria-pressed={!twoTone} disabled={disabled} onClick={()=>onLayout('one-tone')}>One Tone</button>
        <button className={`chip ${twoTone?'selected':''}`} aria-pressed={twoTone} disabled={disabled} onClick={()=>onLayout(twoTone?layout:'island')}>Two Tone</button>
      </div>
      {twoTone && <div className="chips" role="group" aria-label="Two-tone layout">
        <button className={`chip ${layout==='island'?'selected':''}`} aria-pressed={layout==='island'} disabled={disabled} onClick={()=>onLayout('island')}>Island</button>
        <button className={`chip ${layout==='wall-base'?'selected':''}`} aria-pressed={layout==='wall-base'} disabled={disabled} onClick={()=>onLayout('wall-base')}>Wall &amp; Base</button>
      </div>}
    </div>
    {twoTone && <div className="viz-tone-targets" role="group" aria-label="Cabinet colors">
      {[['light',light,layout==='island'?'Cabinets':'Wall'],['dark',dark,layout==='island'?'Island':'Base']].map(([id,color,label])=><button key={id} className={`viz-tone-target ${tone===id?'selected':''}`} aria-label={`Choose ${id==='light'?'Lighter':'Darker'} Color for ${label}: ${color?.name || (id==='light'?'Lighter Color':'Darker Color')}`} aria-pressed={tone===id} disabled={disabled} onClick={()=>onTone(id)}><span className="viz-tone-chip" style={{background:color?.hex || '#eef3f7'}}/><span><strong>{label}</strong><span id={`viz-tone-${id}`}>{color?.name || (id==='light'?'Lighter Color':'Darker Color')}</span></span></button>)}
    </div>}
  </div>;
}
