import {renderFilename} from './renderNames.js';

export function renderFiles(records) {
  return records.map((record,index)=>{
    if(!record.renderPhoto?.size)throw new Error('A selected preview is not available on this tablet yet. Let it finish syncing first.');
    const type=record.renderPhoto.type;
    const ext=type==='image/webp'?'webp':type==='image/png'?'png':'jpg';
    return new File([record.renderPhoto],`${renderFilename(record,index)}.${ext}`,{type});
  });
}

// Keep file creation and share() in the tap handler: iPad requires user activation.
export function emailRenders(records) {
  if(!records.length)throw new Error('Select at least one preview.');
  const files=renderFiles(records);
  if(!navigator.share || !navigator.canShare?.({files}))throw new Error('This browser cannot attach these images to an email. Use the installed tablet app, or save the images and attach them in your email app. If you selected many previews, try fewer at once.');
  return navigator.share({files,title:'Your Spray-Net Design Previews'});
}
