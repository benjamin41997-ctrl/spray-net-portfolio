import { colorsById } from '../data/colors.js';

export const surfaceNames = {cabinets:'Cabinets',upperCabinets:'Wall Cabinets',lowerCabinets:'Base Cabinets',island:'Island',siding:'Siding',frontDoor:'Front Door',garageDoor:'Garage Door',soffits:'Soffits',fascia:'Fascia',windows:'Windows',trim:'Trim',brick:'Brick',stucco:'Stucco',vents:'Vents',columns:'Columns'};
export const exteriorSurfaces = ['siding','frontDoor','garageDoor','soffits','fascia','windows','trim','brick','stucco','vents','columns'];
export const cabinetLayout = surfaces => Object.hasOwn(surfaces,'upperCabinets') || Object.hasOwn(surfaces,'lowerCabinets') ? 'wall-base' : Object.hasOwn(surfaces,'island') ? 'island' : 'one-tone';
export function cabinetTones(surfaces) {
  return cabinetLayout(surfaces) === 'wall-base'
    ? {light:surfaces.upperCabinets || '',dark:surfaces.lowerCabinets || ''}
    : {light:surfaces.cabinets || '',dark:surfaces.island || ''};
}
function luminance(id) {
  const hex = colorsById.get(id)?.hex;
  if (!hex) return null;
  const channels = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(n => n <= 0.04045 ? n/12.92 : ((n+0.055)/1.055)**2.4);
  return channels[0]*0.2126 + channels[1]*0.7152 + channels[2]*0.0722;
}
export function cabinetSurfaces(layout, light, dark = '') {
  if (layout === 'one-tone') return light ? {cabinets:light} : {};
  if (light && dark && luminance(light) !== null && luminance(dark) !== null && luminance(light) < luminance(dark)) [light,dark] = [dark,light];
  return layout === 'wall-base'
    ? {upperCabinets:light,lowerCabinets:dark,island:dark}
    : {cabinets:light,island:dark};
}
