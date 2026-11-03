import {sameCabinetColors} from './cabinetAppearance.js';

// Promote a surviving image when a cabinet-color reference is removed.
export function withoutRender(looks, id) {
  const remaining=looks.filter(look=>look.id!==id);
  return remaining.map(look=>{
    if(look.cabinetReferenceId!==id)return look;
    const replacement=remaining.filter(candidate=>candidate.photoId===look.photoId && !candidate.design.customPrompt && sameCabinetColors(candidate.design,look.design)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    return {...look,cabinetReferenceId:replacement?.id || look.id};
  });
}

export function renderFiles(records) {
  return records.map((record,index)=>{
    if(!record.renderPhoto?.size)throw new Error('A selected preview is not available on this tablet yet. Let it finish syncing first.');
    const type=record.renderPhoto.type;
    const ext=type==='image/webp'?'webp':type==='image/png'?'png':'jpg';
    return new File([record.renderPhoto],`spray-net-preview-${index+1}-${record.id.slice(0,8)}.${ext}`,{type});
  });
}

// Keep file creation and share() in the tap handler: iPad requires user activation.
export function emailRenders(records) {
  if(!records.length)throw new Error('Select at least one preview.');
  const files=renderFiles(records);
  if(!navigator.share || !navigator.canShare?.({files}))throw new Error('This browser cannot attach these images to an email. Use the installed tablet app, or save the images and attach them in your email app. If you selected many previews, try fewer at once.');
  return navigator.share({files,title:'Your Spray-Net Design Previews'});
}
