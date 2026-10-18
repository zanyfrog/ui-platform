import type { ProblemsReport } from '../../shared/application-diagnostics.js';
/** Latest-request admission only; holds saved diagnostics, never editor state. */
export class LatestProblems {
  private sequence = 0;
  invalidate() { this.sequence++; }
  async refresh(load: () => Promise<ProblemsReport>, apply: (report: ProblemsReport) => void) {
    const sequence = ++this.sequence;
    try {
      const report = await load();
      if (sequence !== this.sequence) return false;
      if (report.status === 'stale') throw new Error('Saved validation capture became stale.');
      apply(report); return true;
    } catch (error) { if (sequence === this.sequence) throw error; return false; }
  }
}
