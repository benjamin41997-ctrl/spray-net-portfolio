import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const sources={};
for(const name of ['lib/renderLabel.js','lib/visualizerDesign.js','lib/colorCatalog.js','data/colors.js','data/sherwinWilliams.js'])sources['/'+name]=await readFile(new URL('../src/'+name,import.meta.url),'utf8');
const photo=(await readFile(new URL('../public/media/projects/chantilly-lace-kitchen/after.webp',import.meta.url))).toString('base64');
test('exact color names and codes are embedded at bottom-left without changing image dimensions',async({page})=>{
 await page.route('https://label-test.invalid/**',route=>{const source=sources[new URL(route.request().url()).pathname];return route.fulfill({contentType:source?'text/javascript':'text/html',body:source||'<!doctype html><html lang="en"><title>Label test</title><body></body></html>'});});
 await page.goto('https://label-test.invalid/');
 const result=await page.evaluate(async(encoded)=>{
  const {renderLabelLines,labelRender}=await import('/lib/renderLabel.js');
  const design={surfaces:{cabinets:'sw-7008',island:'sw-6258'}};
  const blob=new Blob([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],{type:'image/webp'});
  const labeled=await labelRender(blob,design),url=URL.createObjectURL(labeled),img=new Image();await new Promise(resolve=>{img.onload=resolve;img.src=url;});
  const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixel=[...ctx.getImageData(18,canvas.height-18,1,1).data];URL.revokeObjectURL(url);
  return {lines:renderLabelLines(design),removed:renderLabelLines({mode:'exterior',surfaces:{},shutterAction:'remove'}),pixel,width:canvas.width,height:canvas.height,unknown:renderLabelLines({surfaces:{}}),custom:renderLabelLines({surfaces:{},customPrompt:'Use SW 7008 on the island.'}),image:await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(labeled);})};
 },photo);
 expect(result.lines).toEqual(['Cabinets: Alabaster (SW 7008)','Island: Tricorn Black (SW 6258)']);
 expect(result.width).toBe(1280);expect(result.height).toBe(853);
 expect(result.removed).toEqual(['Shutters: Removed']);
 expect(result.pixel[0]).toBeLessThan(10);expect(Math.abs(result.pixel[1]-57)).toBeLessThan(10);expect(Math.abs(result.pixel[2]-101)).toBeLessThan(10);
 expect(result.unknown[0]).toContain('Existing Colors');expect(result.custom.join(' ')).toContain('Alabaster (SW 7008)');
});
