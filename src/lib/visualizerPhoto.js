export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
const MAX_PHOTO_PIXELS = 64_000_000;
const MAX_PHOTO_DIMENSION = 32_768;
const OUTPUT_LONG_EDGE = 1600;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i;

function validateDimensions(width, height) {
  if (!width || !height || width > MAX_PHOTO_DIMENSION || height > MAX_PHOTO_DIMENSION || width * height > MAX_PHOTO_PIXELS) {
    throw new Error('This photo is too large to prepare safely on a tablet. Choose a photo under 64 megapixels or export a smaller copy.');
  }
}

// Check common compressed formats before allocating their full decoded image.
// The browser still validates the complete file when it decodes the photograph.
async function checkImageHeader(file) {
  const buffer = await file.slice(0, 1024 * 1024).arrayBuffer();
  const data = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 24 && data.getUint32(0) === 0x89504e47 && data.getUint32(4) === 0x0d0a1a0a) {
    validateDimensions(data.getUint32(16), data.getUint32(20));
    return;
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = data.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        validateDimensions(data.getUint16(offset + 5), data.getUint16(offset + 3));
        return;
      }
      offset += length;
    }
  }
  if (bytes.length >= 30 && data.getUint32(0) === 0x52494646 && data.getUint32(8) === 0x57454250) {
    const chunk = data.getUint32(12);
    if (chunk === 0x56503858) {
      const uint24 = (offset) => bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
      validateDimensions(uint24(24) + 1, uint24(27) + 1);
    } else if (chunk === 0x56503820 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      validateDimensions(data.getUint16(26, true) & 0x3fff, data.getUint16(28, true) & 0x3fff);
    } else if (chunk === 0x5650384c && bytes[20] === 0x2f) {
      validateDimensions(1 + (((bytes[22] & 0x3f) << 8) | bytes[21]), 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | ((bytes[22] & 0xc0) >> 6)));
    }
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image decoding failed.'));
    };
    image.src = url;
  });
}

export function getDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('The photo could not be read. Please select it again.'));
    reader.onabort = () => reject(new Error('Reading the photo was interrupted. Please select it again.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Prepare a local upload without making any network request. Preserves camera
 * orientation, limits the longest edge to 1600px, and strips photo metadata by
 * encoding a new JPEG. HEIC/HEIF works only when this browser can decode it.
 */
export async function preparePhoto(file) {
  if (!(file instanceof Blob) || !file.size) throw new Error('Choose a photo to get started.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Choose a photo smaller than 20 MB.');
  const type = file.type.toLowerCase();
  if (!IMAGE_TYPES.has(type) && !((!type || type === 'application/octet-stream') && IMAGE_EXTENSIONS.test(file.name || ''))) {
    throw new Error('Choose a JPEG, PNG, WebP, or HEIC photo.');
  }
  await checkImageHeader(file);
  let image;
  try {
    if (typeof createImageBitmap === 'function') {
      try {
        image = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        // Safari can decode some camera formats in an image element only.
      }
    }
    if (!image) image = await loadImage(file);
  } catch (error) {
    if (/hei[cf]/i.test(type) || /\.(heic|heif)$/i.test(file.name || '')) {
      throw new Error('This browser cannot read this HEIC photo. Take a new photo here or choose a JPEG copy from your photo library.', { cause: error });
    }
    throw new Error('This photo could not be opened. Try another photo or export a JPEG copy.', { cause: error });
  }

  let canvas;
  try {
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    validateDimensions(originalWidth, originalHeight);
    const scale = Math.min(1, OUTPUT_LONG_EDGE / Math.max(originalWidth, originalHeight));
    const width = Math.max(1, Math.round(originalWidth * scale));
    const height = Math.max(1, Math.round(originalHeight * scale));
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the photo. Please try again.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('This photo could not be prepared. Try a smaller photo.')), 'image/jpeg', 0.9);
    });
    return { blob, dataUrl: await getDataUrl(blob), width, height };
  } finally {
    image.close?.();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
