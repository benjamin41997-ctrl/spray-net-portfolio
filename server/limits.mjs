import { ApiError } from './design.mjs';

export function reserveAttempt(previous, config, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  let record = previous ?? { version: 1, day: today, count: 0, recentAttempts: [] };
  if (record.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(record.day) || record.day > today || !Number.isInteger(record.count) || record.count < 0 || !Array.isArray(record.recentAttempts) || record.recentAttempts.some(value => !Number.isSafeInteger(value) || value > now)) {
    throw new ApiError(503, 'quota_unavailable', 'Rendering is temporarily unavailable. Ask your representative to check the connection.');
  }
  record = { ...record, recentAttempts: record.recentAttempts.filter(value => value > now - 3_600_000) };
  if (record.day !== today) record = { ...record, day: today, count: 0 };
  const wait=(attempts,windowMs)=>Math.max(1,Math.ceil((attempts[0]+windowMs-now)/1000));
  const delay=seconds=>`${Math.ceil(seconds/60)} ${Math.ceil(seconds/60)===1?'minute':'minutes'}`;
  if (record.recentAttempts.length >= config.maxHourly) {
    const seconds=wait(record.recentAttempts,3_600_000);
    throw new ApiError(429,'hourly_limit',`You have reached ${config.maxHourly} previews in one hour. Try again in ${delay(seconds)}. Your saved designs are still available.`,seconds);
  }
  const tenMinuteAttempts=record.recentAttempts.filter(value=>value>now-600_000);
  if(tenMinuteAttempts.length>=config.maxTenMinutes) {
    const seconds=wait(tenMinuteAttempts,600_000);
    throw new ApiError(429,'ten_minute_limit',`You have reached ${config.maxTenMinutes} previews in 10 minutes. Try again in ${delay(seconds)}. Your saved designs are still available.`,seconds);
  }
  const last = record.recentAttempts.at(-1);
  if (last !== undefined && now - last < config.minIntervalMs) throw new ApiError(429, 'rate_limit', 'Please wait a moment before creating another rendering.', Math.ceil((last + config.minIntervalMs - now) / 1000));
  record.count += 1;
  record.recentAttempts.push(now);
  return record;
}
