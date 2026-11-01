import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ApiError } from './design.mjs';

export const secretMatches = (a, b) => Boolean(b && timingSafeEqual(createHash('sha256').update(a || '').digest(), createHash('sha256').update(b).digest()));

export function tabletCredentials(config) {
  if (!config.tabletPassword) return null;
  const derive = (key, scope) => key ? createHmac('sha256', key).update(`spray-net:${scope}:${config.tabletPassword}`).digest('base64url') : '';
  return {token:derive(config.accessToken, 'tablet'), operatorToken:derive(config.operatorToken, 'operator')};
}

// Connection attempts have their own durable allowance and never consume paid renders.
export function reserveConnectionAttempt(previous, key, now = Date.now()) {
  const record = previous ?? {version:1, attempts:[]};
  if (record.version !== 1 || !Array.isArray(record.attempts) || record.attempts.length > 100 || record.attempts.some(a => !/^[a-f0-9]{64}$/.test(a.key) || !Number.isSafeInteger(a.time) || a.time > now)) throw new ApiError(503, 'connection_unavailable', 'Tablet connection is temporarily unavailable. Please try again later.');
  const attempts = record.attempts.filter(a => a.time > now - 600_000);
  const same = attempts.filter(a => a.key === key);
  const limited = same.length >= 6 ? same : attempts.length >= 100 ? attempts : null;
  if (limited) throw new ApiError(429, 'connection_limit', 'Too many password attempts. Please wait a few minutes and try again.', Math.max(1, Math.ceil((limited[0].time + 600_000 - now) / 1000)));
  return {version:1, attempts:[...attempts, {key,time:now}]};
}

export const connectionFingerprint = request => createHash('sha256').update(request.headers.get('cf-connecting-ip') || 'local').digest('hex');
