const DATABASE_NAME = 'spray-net-visualizer';
const DATABASE_VERSION = 1;
const STORE_NAME = 'renders';

let databasePromise;
let persistenceRequested = false;

function storageError(error) {
  if (error?.name === 'QuotaExceededError') {
    return new Error('This device is out of storage. Remove an older saved rendering or free up device space, then try saving again.', { cause: error });
  }
  if (error?.name === 'SecurityError' || error?.name === 'InvalidStateError') {
    return new Error('Local photo storage is unavailable in this browser. Open the portfolio in a regular browser window and try again.', { cause: error });
  }
  return error instanceof Error ? error : new Error('The rendering could not be saved on this device. Please try again.');
}

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('This browser does not support local photo storage. Please use an up-to-date Safari, Chrome, or Edge browser.'));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    let rejected = false;
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      if (rejected) {
        database.close();
        return;
      }
      database.onversionchange = () => {
        database.close();
        databasePromise = undefined;
      };
      resolve(database);
    };
    request.onerror = () => reject(storageError(request.error));
    request.onblocked = () => {
      rejected = true;
      reject(new Error('Close other open portfolio tabs and try again to unlock local photo storage.'));
    };
  }).catch((error) => {
    databasePromise = undefined;
    throw storageError(error);
  });
  return databasePromise;
}

async function transact(mode, operation) {
  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      let request;
      let requestError;
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(storageError(transaction.error || requestError));
      transaction.onerror = () => {
        // An IndexedDB request failure aborts the transaction; report that result.
      };
      try {
        request = operation(transaction.objectStore(STORE_NAME));
        request.onerror = () => { requestError = request.error; };
      } catch (error) {
        transaction.abort();
        reject(storageError(error));
      }
    });
  } catch (error) {
    throw storageError(error);
  }
}

function assertImage(blob, label) {
  if (!(blob instanceof Blob) || !blob.size || !/^image\/(jpeg|png|webp)$/i.test(blob.type)) {
    throw new Error(`${label} must be a nonempty JPEG, PNG, or WebP image.`);
  }
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `render-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function restorePhoto(photo) {
  return photo instanceof Blob ? photo : new Blob([photo.bytes], { type: photo.type });
}

function restoreRecord(record) {
  if (!record) return null;
  return { ...record, originalPhoto: restorePhoto(record.originalPhoto), renderPhoto: restorePhoto(record.renderPhoto) };
}

/**
 * Save an original photo and a generated image together, only on this device.
 * Resolves only after IndexedDB has committed both images and the design.
 * Browser storage is not a backup: clearing site data removes saved images.
 */
export async function saveRender({ originalPhoto, renderPhoto, design, photoId, consultationLabel = '', id = createId(), createdAt = new Date().toISOString() }) {
  assertImage(originalPhoto, 'Original photo');
  assertImage(renderPhoto, 'Rendering');
  if (!design || typeof design !== 'object' || Array.isArray(design)) {
    throw new Error('Include the design selections when saving a rendering.');
  }
  if (typeof id !== 'string' || !id || id.length > 128) throw new Error('This rendering has an invalid identifier.');
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) throw new Error('This rendering has an invalid creation date.');
  const record = {
    id,
    createdAt: date.toISOString(),
    consultationLabel: String(consultationLabel).trim().slice(0, 160),
    originalPhoto,
    renderPhoto,
    design: structuredClone(design),
    ...(typeof photoId === 'string' && photoId.length <= 128 ? {photoId} : {}),
  };
  // Some WebKit environments cannot persist native Blob objects in IndexedDB.
  // Store lossless bytes and reconstruct Blobs at this module's API boundary.
  const [originalBytes, renderBytes] = await Promise.all([originalPhoto.arrayBuffer(), renderPhoto.arrayBuffer()]);
  const storedRecord = {
    ...record,
    originalPhoto: { bytes: originalBytes, type: originalPhoto.type },
    renderPhoto: { bytes: renderBytes, type: renderPhoto.type },
  };
  await transact('readwrite', (store) => store.put(storedRecord));

  // Persistence is a best-effort browser safeguard, not a guarantee or a sync.
  if (!persistenceRequested && globalThis.navigator?.storage?.persist) {
    persistenceRequested = true;
    Promise.resolve().then(() => navigator.storage.persist()).catch(() => {});
  }
  return record;
}

/** Returns complete saved records, newest first. Call only in the rep library. */
export async function listRenders() {
  const records = await transact('readonly', (store) => store.index('createdAt').getAll());
  return records.reverse().map(restoreRecord);
}

export async function getRender(id) {
  return restoreRecord(await transact('readonly', (store) => store.get(id)));
}

export async function deleteRender(id) {
  await transact('readwrite', (store) => store.delete(id));
}

/** Browser estimates include other portfolio storage, including offline media. */
export async function storageSummary() {
  const count = await transact('readonly', (store) => store.count());
  const storage = globalThis.navigator?.storage;
  const [estimate, persistent] = await Promise.all([
    storage?.estimate ? storage.estimate().catch(() => ({})) : {},
    storage?.persisted ? storage.persisted().catch(() => false) : false,
  ]);
  return { count, usageBytes: estimate.usage ?? null, quotaBytes: estimate.quota ?? null, persistent };
}
