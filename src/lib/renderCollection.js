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
