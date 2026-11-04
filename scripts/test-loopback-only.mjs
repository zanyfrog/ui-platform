// Test-process listener restriction, matching the accepted Stage 1 fixture boundary.
// Production listener and identity configuration are unchanged.
import { Server } from 'node:net';
const listen = Server.prototype.listen;
Server.prototype.listen = function (...args) {
  if (typeof args[0] === 'number' && args[1] === '0.0.0.0') {
    args[1] = '127.0.0.1';
    this.once('listening', () => {
      if (this.address().address !== '127.0.0.1') throw new Error('Stage 2 test listener escaped loopback');
      process.stdout.write('Stage 2 fixture API verified on 127.0.0.1\n');
    });
  }
  return listen.apply(this, args);
};
