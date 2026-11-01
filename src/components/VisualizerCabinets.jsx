export default function VisualizerCabinets({layout, tone, light, dark, onLayout, onTone, disabled}) {
  const twoTone=layout!=='one-tone';
  const first=layout==='island'?'Island Color':'Base Cabinet Color';
  const second=layout==='island'?'Cabinet Color':'Wall Cabinet Color';
  const step=tone==='dark'?1:2;
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
    {twoTone && <>
      <div className="viz-wizard-prompt" aria-live="polite"><span>Step {step} of 2</span><h3>Select {step===1?first:second}</h3><p>{step===1?(layout==='island'?'Choose the darker color for your island.':'Choose the darker color for your base and island cabinets.'):(layout==='island'?'Choose the lighter color for the remaining cabinets.':'Choose the lighter color for your wall cabinets.')}</p></div>
      <div className="viz-tone-targets" role="group" aria-label="Cabinet colors">
        {[['dark',dark,first,1],['light',light,second,2]].map(([id,color,label,number])=><button key={id} className={`viz-tone-target ${tone===id?'selected':''}`} aria-label={`Choose ${id==='light'?'Lighter':'Darker'} Color: ${number}. ${label}, ${color?.name || 'Choose a Color'}`} aria-pressed={tone===id} disabled={disabled} onClick={()=>onTone(id)}><span className="viz-tone-chip" style={{background:color?.hex || '#eef3f7'}}/><span><strong>{number}. {label}</strong><span>{color?.name || 'Choose a Color'}</span></span></button>)}
      </div>
    </>}
  </div>;
}
