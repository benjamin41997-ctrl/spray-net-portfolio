let database;
function open() {
  return database ||= new Promise((resolve,reject)=>{
    const request=indexedDB.open('spray-net-consultations',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('cache');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  }).catch(error=>{database=null;throw error;});
}
async function transact(mode,operation) {
  const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('cache',mode);const request=operation(tx.objectStore('cache'));tx.oncomplete=()=>resolve(request?.result);tx.onabort=()=>reject(tx.error || new Error('Unable to save consultation locally.'));tx.onerror=()=>{};});
}
export const cacheGet=key=>transact('readonly',store=>store.get(key));
export const cachePut=(key,value)=>transact('readwrite',store=>store.put(value,key));
export const cacheDelete=key=>transact('readwrite',store=>store.delete(key));
export async function cacheMedia(key,blob) {await cachePut('media:'+key,{bytes:await blob.arrayBuffer(),type:blob.type});}
export async function cachedMedia(key) {const item=await cacheGet('media:'+key);return item?new Blob([item.bytes],{type:item.type}):null;}
export const blobDataUrl=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Unable to read this photo.'));reader.readAsDataURL(blob);});
export async function queuedTasks() {return (await transact('readonly',store=>store.getAll(IDBKeyRange.bound('task:','task:\uffff')))).sort((a,b)=>a.order-b.order);}
let lastOrder=0;
export async function queueTask(task) {const taskId=crypto.randomUUID();lastOrder=Math.max(Date.now(),lastOrder+1);await cachePut('task:'+taskId,{...task,taskId,order:lastOrder});return taskId;}
export const removeTask=id=>cacheDelete('task:'+id);
export const mediaPath=(consultationId,itemId,kind)=>`${consultationId}/${itemId}/${kind}`;
