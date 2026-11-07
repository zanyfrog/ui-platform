import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { hrtime } from 'node:process';
import type { JWTPayload } from 'jose';
import { deny } from './boundary.js';

const lifetime = 15;
const retention = 15_000_000_000n;
let query: StatementSync | undefined;
function wallTime(): unknown {
  if (process.platform !== 'win32') return Date.now();
  // SQLite supplies millisecond resolution. Round away binary floating-point
  // conversion noise, not a fraction of an actual clock tick.
  query ??= new DatabaseSync(':memory:').prepare("SELECT round(unixepoch('subsec') * 1000) AS ms");
  return query.get()?.ms;
}

type Sample = { wall: number; before: bigint; after: bigint };
const slack = 64_000_000n;

/** Sticky for the process lifetime. Recovery requires a controlled restart. */
export class InternalJwtClock {
  private last?: Sample;
  private fault = false;
  constructor(private readonly wall = wallTime, private readonly elapsed = hrtime.bigint) {}
  sample(): Sample {
    if (this.fault) deny();
    try {
      const before = this.elapsed(), wall = this.wall(), after = this.elapsed();
      if (typeof wall !== 'number' || !Number.isSafeInteger(wall) || wall <= 0 || wall > 8.64e15 || before < 0n || after < before || after - before > slack) deny();
      const last = this.last;
      if (last) {
        const wallDelta = BigInt(wall - last.wall) * 1_000_000n;
        const upper = after - last.before, lower = before - last.after;
        // Bracket sampling uncertainty, then allow ordinary timer granularity
        // and up to 1 ms/s relative slew. This never adjusts a claim check.
        const uncertainty = slack + upper / 1000n;
        if (wall < last.wall || lower < 0n || wallDelta < lower - uncertainty || wallDelta > upper + uncertainty) deny();
      }
      return this.last = { wall, before, after };
    } catch {
      this.fault = true;
      deny();
    }
  }
}

export const internalJwtClock = new InternalJwtClock();
export const internalJwtLifetime = lifetime;

export function assertInternalJwtTime(p: JWTPayload, sample: Sample) {
  const now = Math.floor(sample.wall / 1000);
  if (typeof p.iat !== 'number' || !Number.isFinite(p.iat) || typeof p.exp !== 'number' || !Number.isFinite(p.exp) ||
      p.iat > now || now - p.iat > lifetime || p.exp <= now || p.exp - p.iat > lifetime ||
      (p.nbf !== undefined && (!Number.isFinite(p.nbf) || p.nbf > now))) deny();
}

export class InternalJwtReplay {
  private readonly used = new Map<string, { exp: number; retainUntil: bigint }>();
  consume(p: JWTPayload, sample: Sample) {
    assertInternalJwtTime(p, sample);
    if (typeof p.iss !== 'string' || typeof p.jti !== 'string') deny();
    for (const [key, entry] of this.used) {
      if (entry.exp <= Math.floor(sample.wall / 1000) && entry.retainUntil <= sample.before) this.used.delete(key);
    }
    const key = JSON.stringify([p.iss, p.jti]);
    if (this.used.has(key) || this.used.size >= 8192) deny();
    this.used.set(key, { exp: p.exp!, retainUntil: sample.after + retention });
  }
}
