export const viewLandmarks={sink:'Sink',dishwasher:'Dishwasher',fridge:'Fridge',stove:'Stove',island:'Island',vanity:'Vanity',front:'Front',rear:'Rear',side:'Side',garage:'Garage',entry:'Entry'};
export const viewKeys=mode=>mode==='kitchen'?['sink','dishwasher','fridge','stove','island','vanity']:['front','rear','side','garage','entry'];
export function photoViewLabel(mode,landmarks=[]) {
  const names=[...new Set(landmarks)].filter(key=>viewKeys(mode).includes(key)).slice(0,2).map(key=>viewLandmarks[key]);
  return names.length?`${names.join(' & ')} View`:mode==='exterior'?'Exterior Overview':'Kitchen Overview';
}
export const viewSuggestions=['Sink View','Sink & Dishwasher View','Fridge View','Stove View','Island View','Vanity View','Kitchen Overview','Front View','Rear View','Side View','Garage View','Entry View','Exterior Overview'];
