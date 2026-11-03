export const cabinetFinishKeys=['hardwareStyle','hardwareFinish','backsplash','countertop'];
export function cabinetColorKey(design) {
  const entries=Array.isArray(design?.surfaces)?design.surfaces.map(({surface,color})=>[surface,color.id]):Object.entries(design?.surfaces || {});
  return JSON.stringify(entries.filter(([,id])=>id).sort(([a],[b])=>a.localeCompare(b)));
}
export const sameCabinetColors=(a,b)=>a?.mode==='kitchen' && b?.mode==='kitchen' && cabinetColorKey(a)===cabinetColorKey(b);
export function findCabinetReference(looks,photoId,design,selectedId) {
  if(design.mode!=='kitchen')return null;
  const matching=looks.filter(r=>r.photoId===photoId && !r.design.customPrompt && r.rawRenderPhoto?.size>0 && r.rawRenderPhoto.size<=6*1024*1024 && sameCabinetColors(r.design,design)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const selected=matching.find(r=>r.id===selectedId) || matching[0];
  return selected?(matching.find(r=>r.id===selected.cabinetReferenceId) || selected):null;
}
