import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleSnapshotRefresh } from '../src/investor/snapshot-refresh.js';

test('snapshot refresh retries failures, resumes visible/online tabs and cleans up', async () => {
  const events = new EventTarget(), visibility = new EventTarget();
  visibility.visibilityState = 'visible';
  const timers = new Map();
  let reads = 0, nextId = 0;
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const stop = scheduleSnapshotRefresh(async () => ++reads > 1, {
    events, visibility,
    setTimer(fn, delay) { const id = ++nextId; timers.set(id, { fn, delay }); return id; },
    clearTimer(id) { timers.delete(id); },
  });
  await settle();
  assert.equal(reads, 1);
  assert.equal([...timers.values()][0].delay, 60_000);
  await [...timers.values()][0].fn();
  assert.equal(reads, 2);
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].delay, 3_600_000);
  visibility.visibilityState = 'hidden';
  visibility.dispatchEvent(new Event('visibilitychange'));
  await settle(); assert.equal(reads, 2);
  visibility.visibilityState = 'visible';
  visibility.dispatchEvent(new Event('visibilitychange'));
  events.dispatchEvent(new Event('online'));
  await settle(); assert.equal(reads, 3); // Concurrent events share the request.
  stop(); assert.equal(timers.size, 0);
  events.dispatchEvent(new Event('online'));
  visibility.dispatchEvent(new Event('visibilitychange'));
  await settle(); assert.equal(reads, 3);
});

test('unmount during an in-flight request does not schedule another refresh', async () => {
  let finish, scheduled = false;
  const stop = scheduleSnapshotRefresh(() => new Promise(resolve => { finish = resolve; }), {
    events: new EventTarget(), visibility: new EventTarget(),
    setTimer() { scheduled = true; }, clearTimer() {},
  });
  stop(); finish(true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(scheduled, false);
});
