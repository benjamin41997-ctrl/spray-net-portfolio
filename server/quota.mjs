import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { ApiError } from './design.mjs';
import { reserveAttempt } from './limits.mjs';
import { reserveConnectionAttempt } from './pairing.mjs';

const unavailable = () => new ApiError(503, 'quota_unavailable', 'Rendering is temporarily unavailable. Ask your representative to check the connection.');

export class UsageLedger {
  constructor(file, config) {
    this.file = file;
    this.config = config;
  }

  reserve(now = Date.now()) { return this.write(previous => reserveAttempt(previous, this.config, now)).count; }

  write(update) {
    try {
      const previous = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) : null;
      const record = update(previous);
      mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 });
      const temporary = `${this.file}.tmp`;
      const fd = openSync(temporary, 'w', 0o600);
      try {
        writeFileSync(fd, JSON.stringify(record));
        fsyncSync(fd);
      } finally {
        closeSync(fd);
      }
      renameSync(temporary, this.file);
      return record;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw unavailable();
    }
  }
}

export class ConnectionLedger extends UsageLedger {
  reserve(key, now = Date.now()) { return this.write(previous => reserveConnectionAttempt(previous, key, now)); }
}

// One host process owns each ledger; fail closed after an unclean shutdown until inspected.
export function acquireLedgerLock(file) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const lockFile = `${file}.lock`;
  let fd;
  try {
    fd = openSync(lockFile, 'wx', 0o600);
    writeFileSync(fd, String(process.pid));
  } catch {
    throw new Error('The usage ledger is already locked. Stop other API processes; inspect a stale lock before removing it.');
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    closeSync(fd);
    unlinkSync(lockFile);
  };
}
