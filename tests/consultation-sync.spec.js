import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {consultationFixture,accessToken,operatorToken} from './consultation-fixture.mjs';
import {projects} from '../src/data/projects.js';

const endpoint='https://consultation-sync-test.invalid';
const renderImage='data:image/webp;base64,'+(await readFile(new URL('../public/'+projects[0].afterImage,import.meta.url))).toString('base64');
async function tools(page) {const button=page.getByRole('group',{name:'Project type'}).locator('button[aria-pressed=true]');for(let i=0;i<8;i++)await button.click();await expect(page.getByRole('heading',{name:'Consultation Tools',exact:true})).toBeVisible();}
async function install(context,h) {
  await context.addInitScript(({endpoint,accessToken,operatorToken})=>localStorage.setItem('spray-net-render-connection-v1',JSON.stringify({version:1,endpoint,token:accessToken,operatorToken})),{endpoint,accessToken,operatorToken});
  await context.route(endpoint+'/api/**',async route=>{
    const request=route.request();const response=await h.api(new Request(request.url(),{method:request.method(),headers:request.headers(),...(['GET','HEAD'].includes(request.method())?{}:{body:request.postDataBuffer()})}));
    await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  });
}
async function upload(page) {await page.getByLabel('Choose home photo',{exact:true}).setInputFiles(fileURLToPath(new URL('../public/'+projects[0].beforeImage,import.meta.url)));await expect(page.getByRole('button',{name:'Select Photo 1',exact:true})).toBeVisible();}
async function create(page) {await page.getByLabel('Find a Color',{exact:true}).fill('SW7008');await page.locator('.viz-swatch').first().click();await page.getByRole('button',{name:'Create My Preview',exact:true}).click();await expect(page.locator('.viz-look-strip button')).toHaveCount(1);}

test('an old local preview can be deleted after its shared consultation was removed elsewhere',async({browser,baseURL})=>{
  test.setTimeout(60_000);const h=consultationFixture({origin:new URL(baseURL).origin,renderImage});const context=await browser.newContext({serviceWorkers:'block'});await install(context,h);const page=await context.newPage();
  try{
    await page.goto(baseURL+'#/visualize');await upload(page);await create(page);await expect(page.locator('.viz-sync-status')).toContainText('Synced');
    const c=(await h.request('/api/consultations/active').then(r=>r.json())).active;await h.request('/api/consultations',{action:'delete',consultationId:c.id});
    await expect(page).not.toHaveURL(/#\/visualize/,{timeout:15000});await page.goto(baseURL+'#/visualize');await tools(page);
    await page.getByRole('button',{name:'Saved Previews on This Tablet',exact:true}).click();await expect(page.locator('.viz-render-card')).toHaveCount(1);
    page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Delete Preview 1',exact:true}).click();
    await expect(page.locator('.viz-render-card')).toHaveCount(0);await expect(page.locator('.viz-saved-item')).toHaveCount(0);expect(h.objects.size).toBe(0);
  }finally{await context.close();}
});

test('deleting one shared preview removes it on both tablets, preserves originals and a usable cabinet reference',async({browser,baseURL})=>{
  test.setTimeout(90_000);const h=consultationFixture({origin:new URL(baseURL).origin,renderImage});
  const first=await browser.newContext({serviceWorkers:'block'}),second=await browser.newContext({serviceWorkers:'block'});
  await Promise.all([install(first,h),install(second,h)]);const rep=await first.newPage(),customer=await second.newPage();
  try{
    await rep.goto(baseURL+'#/visualize');await upload(rep);await create(rep);
    await rep.getByRole('button',{name:'Hardware Finishes',exact:true}).click();await rep.getByLabel('Hardware Finish',{exact:true}).selectOption('gold');
    await rep.getByRole('button',{name:'Create My Preview',exact:true}).click();await expect(rep.locator('.viz-look-strip button')).toHaveCount(2,{timeout:15000});
    await customer.goto(baseURL+'#/visualize');await expect(customer.locator('.viz-look-strip button')).toHaveCount(2,{timeout:20000});
    await expect(rep.locator('.viz-sync-status')).toContainText('Synced');
    await tools(rep);await rep.getByRole('button',{name:'Saved Previews on This Tablet',exact:true}).click();await expect(rep.locator('.viz-saved-item')).toHaveCount(2);
    rep.once('dialog',d=>d.accept());await rep.getByRole('button',{name:'Delete Preview 2',exact:true}).click();
    await expect(rep.locator('.viz-render-card')).toHaveCount(1);await expect(rep.locator('.viz-saved-item')).toHaveCount(1);
    await expect(customer.locator('.viz-look-strip button')).toHaveCount(1,{timeout:20000});await expect(customer.getByRole('button',{name:'Select Photo 1',exact:true})).toBeVisible();
    const c=(await h.request('/api/consultations/active').then(r=>r.json())).active;expect(c.looks[0].cabinetReferenceId).toBe(c.looks[0].id);expect(h.objects.size).toBe(3);
    await customer.getByRole('button',{name:'Create My Preview',exact:true}).click();await expect(customer.locator('.viz-look-strip button')).toHaveCount(2,{timeout:15000});expect(h.renders).toBe(3);
    await rep.reload();await expect(rep.locator('.viz-look-strip button')).toHaveCount(2,{timeout:20000});
  }finally{await first.close();await second.close();}
});

async function offlineControl(context,page,browserName) {
  if(browserName!=='webkit')return offline=>context.setOffline(offline);
  // Playwright WebKit's native offline emulation also blocks local FileReader
  // access on Windows and Linux. Block HTTP traffic instead, while delivering
  // the same browser connectivity state/events and leaving local files usable.
  let disconnected=false;
  await context.route('**/*',route=>disconnected && /^https?:/.test(route.request().url())?route.abort('internetdisconnected'):route.fallback());
  return async offline=>{
    disconnected=offline;
    await page.evaluate(value=>{
      if(value)Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});
      else delete navigator.onLine;
      window.dispatchEvent(new Event(value?'offline':'online'));
    },offline);
  };
}

test('two tablets share originals and renders, clear after one hour, and reopen a named consultation for more work',async({browser,baseURL})=>{
  test.setTimeout(120_000);
  const h=consultationFixture({origin:new URL(baseURL).origin,renderImage});
  const first=await browser.newContext({serviceWorkers:'block'}),second=await browser.newContext({serviceWorkers:'block'});
  await Promise.all([install(first,h),install(second,h)]);
  const rep=await first.newPage(),customer=await second.newPage();
  try{
    await Promise.all([rep.goto(baseURL+'#/visualize'),customer.goto(baseURL+'#/visualize')]);
    await tools(rep);await expect(rep.getByRole('heading',{name:'Shared Consultations',exact:true})).toBeVisible();
    await rep.getByLabel('Consultation Name',{exact:true}).fill('Smith Kitchen');await rep.getByRole('button',{name:'Start a New Consultation',exact:true}).click();
    await upload(rep);await expect(customer.getByRole('button',{name:'Select Photo 1',exact:true})).toBeVisible({timeout:20000});
    await create(customer);await expect(rep.locator('.viz-look-strip button')).toHaveCount(1,{timeout:20000});
    expect(h.renders).toBe(1);await expect(rep.locator('.viz-sync-status')).toContainText('Synced');
    await customer.getByRole('link',{name:'Home',exact:true}).click();await expect(customer.getByRole('heading',{name:'Design Visualizer',exact:true})).toHaveCount(0);
    h.advance(3_600_001);
    await expect(rep).not.toHaveURL(/#\/visualize/,{timeout:15000});await rep.goto(baseURL+'#/visualize');await tools(rep);await rep.getByRole('button',{name:'Saved Consultations',exact:true}).click();
    await expect(rep.getByRole('button',{name:'Open Consultation Smith Kitchen',exact:true})).toBeVisible();
    await rep.getByRole('button',{name:'Open Consultation Smith Kitchen',exact:true}).click();await expect(rep.locator('.viz-look-strip button')).toHaveCount(1);
    await expect(rep.getByRole('button',{name:'Select Photo 1',exact:true})).toBeVisible();await rep.getByRole('button',{name:'Create My Preview',exact:true}).click();await expect(rep.locator('.viz-look-strip button')).toHaveCount(2);
    expect(h.renders).toBe(2);await tools(rep);await rep.getByRole('button',{name:'Saved Consultations',exact:true}).click();await expect(rep.locator('.viz-consultation-list')).toContainText('2 previews',{timeout:20000});
  }finally{await first.close();await second.close();}
});

test('offline originals and previews stay queued locally and sync once connectivity returns',async({browser,baseURL,browserName})=>{
  test.setTimeout(120_000);const h=consultationFixture({origin:new URL(baseURL).origin,renderImage});
  const one=await browser.newContext({serviceWorkers:'block'}),two=await browser.newContext({serviceWorkers:'block'});await Promise.all([install(one,h),install(two,h)]);
  const rep=await one.newPage(),other=await two.newPage();
  const setOffline=await offlineControl(one,rep,browserName);
  try{
    await rep.goto(baseURL+'#/visualize');await tools(rep);await expect(rep.getByRole('heading',{name:'Shared Consultations',exact:true})).toBeVisible();await rep.getByLabel('Consultation Name',{exact:true}).fill('Offline Visit');await rep.getByRole('button',{name:'Start a New Consultation',exact:true}).click();
    await expect.poll(async()=>Boolean((await h.request('/api/consultations/active').then(r=>r.json())).active)).toBe(true);await expect(rep.locator('.viz-sync-status')).toContainText('Synced');await setOffline(true);await upload(rep);await expect(rep.locator('.viz-sync-status')).toContainText('Offline');
    expect((await h.request('/api/consultations/active').then(r=>r.json())).active.photos).toHaveLength(0);
    await setOffline(false);await rep.reload();await other.goto(baseURL+'#/visualize');await expect(other.getByRole('button',{name:'Select Photo 1',exact:true})).toBeVisible({timeout:25000});await expect(rep.getByRole('button',{name:'Select Photo 1',exact:true})).toBeVisible();
    await create(rep);await expect(other.locator('.viz-look-strip button')).toHaveCount(1,{timeout:20000});expect(h.renders).toBe(1);
  }finally{await setOffline(false);await one.close();await two.close();}
});

test('a failed shared upload survives reload and retries without duplicating the original',async({browser,baseURL})=>{
  test.setTimeout(90000);const h=consultationFixture({origin:new URL(baseURL).origin,renderImage});const context=await browser.newContext({serviceWorkers:'block'});await install(context,h);const page=await context.newPage();
  try{
    await page.goto(baseURL+'#/visualize');await tools(page);await expect(page.getByRole('heading',{name:'Shared Consultations',exact:true})).toBeVisible();await page.getByLabel('Consultation Name',{exact:true}).fill('Retry Visit');await page.getByRole('button',{name:'Start a New Consultation',exact:true}).click();
    await expect.poll(async()=>Boolean((await h.request('/api/consultations/active').then(r=>r.json())).active)).toBe(true);
    h.failUploads(true);await upload(page);await expect(page.locator('.viz-sync-status')).toContainText('Not Synced');
    h.failUploads(false);await page.reload();await expect(page.getByRole('button',{name:'Select Photo 1',exact:true})).toBeVisible();
    await expect.poll(async()=>(await h.request('/api/consultations/active').then(r=>r.json())).active.photos.length,{timeout:20000}).toBe(1);expect(h.objects.size).toBe(1);expect(h.renders).toBe(0);
  }finally{await context.close();}
});

test('the cached one-hour deadline clears an offline tablet without deleting its archive',async({browser,baseURL})=>{
  test.setTimeout(90000);const h=consultationFixture({origin:new URL(baseURL).origin,renderImage});const context=await browser.newContext({serviceWorkers:'block'});await install(context,h);const page=await context.newPage();
  try{
    await page.goto(baseURL+'#/visualize');await tools(page);await expect(page.getByRole('heading',{name:'Shared Consultations',exact:true})).toBeVisible();await page.getByLabel('Consultation Name',{exact:true}).fill('Timed Visit');await page.getByRole('button',{name:'Start a New Consultation',exact:true}).click();await upload(page);
    await expect.poll(async()=>(await h.request('/api/consultations/active').then(r=>r.json())).active?.photos.length,{timeout:15000}).toBe(1);
    await page.clock.install();await context.setOffline(true);await page.clock.fastForward(3_600_001);
    await expect(page).toHaveURL(/#\/$/);await expect(page.getByRole('button',{name:'Select Photo 1',exact:true})).toHaveCount(0);
    const library=await h.request().then(r=>r.json());expect(library.consultations[0].photoCount).toBe(1);expect(library.consultations[0].name).toBe('Timed Visit');
  }finally{await context.setOffline(false);await context.close();}
});
