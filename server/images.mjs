import { ApiError } from './design.mjs';

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MAX_BODY_BYTES = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 16 * 1024;
export const MAX_RESPONSE_BYTES = 30 * 1024 * 1024;

function isImage(bytes, type) {
  if (type === 'jpeg') return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'png') return bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && bytes.toString('ascii', 12, 16) === 'IHDR';
  if (type === 'webp') return bytes.length >= 16 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' && bytes.toString('ascii', 12, 15) === 'VP8';
  return false;
}

export function validateImage(image, maximum = MAX_IMAGE_BYTES) {
  const match = typeof image === 'string' && /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match || match[2].length % 4 !== 0) throw new ApiError(400, 'invalid_image', 'Choose a JPEG, PNG or WebP photograph.');
  if (match[2].length > Math.ceil(maximum / 3) * 4) throw new ApiError(413, 'image_too_large', 'The prepared photograph must be smaller than 6 MB.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > maximum) throw new ApiError(413, 'image_too_large', 'The prepared photograph is too large.');
  if (bytes.toString('base64') !== match[2] || !isImage(bytes, match[1])) throw new ApiError(400, 'invalid_image', 'The photograph could not be read. Choose another image.');
  return image;
}
