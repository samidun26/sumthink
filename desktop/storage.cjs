const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const MAX_BYTES = 10 * 1024 * 1024;

function atomicWrite(destination, raw) {
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > MAX_BYTES) throw new Error('Backup exceeds the 10 MB limit.');
  const temporary = path.join(path.dirname(destination), '.' + path.basename(destination) + '.' + randomUUID() + '.tmp');
  let descriptor;
  try {
    descriptor = fs.openSync(temporary, 'wx', 0o600);
    fs.writeFileSync(descriptor, raw, 'utf8');
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor); descriptor = undefined;
    fs.renameSync(temporary, destination);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
class StudioStorage {
  constructor(directory, parseState) {
    this.file = path.join(directory, 'studio.json');
    this.backup = path.join(directory, 'studio.previous.json');
    this.parseState = parseState;
    this.blocked = false;
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  load() {
    try {
      if (!fs.existsSync(this.file)) return { raw: null, error: null };
      if (fs.statSync(this.file).size > MAX_BYTES) throw new Error('Saved data exceeds the size limit.');
      const raw = fs.readFileSync(this.file, 'utf8');
      this.parseState(raw);
      return { raw, error: null };
    } catch {
      this.blocked = true;
      return { raw: null, error: 'Saved data could not be read. It has been preserved. Import a valid backup to recover.' };
    }
  }
  save(raw, { replace = false } = {}) {
    if (this.blocked && !replace) throw new Error('Stored data is unreadable. Import a backup before saving.');
    if (typeof raw !== 'string' || !raw.trim()) throw new Error('Backup must contain studio data.');
    if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) throw new Error('Backup exceeds the 10 MB limit.');
    const normalized = JSON.stringify(this.parseState(raw), null, 2);
    if (fs.existsSync(this.file)) {
      const previous = fs.readFileSync(this.file, 'utf8');
      try { this.parseState(previous); atomicWrite(this.backup, previous); } catch (error) {
        // Preserve unreadable original bytes separately during an explicit restore.
        if (!replace) throw error;
        atomicWrite(path.join(path.dirname(this.file), 'studio.unreadable-' + Date.now() + '.json'), previous);
      }
    }
    atomicWrite(this.file, normalized);
    this.blocked = false;
    return normalized;
  }
}
module.exports = { StudioStorage, atomicWrite, MAX_BYTES };
