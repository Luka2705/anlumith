// Retry temporary failures promptly; resume suspended tabs when connectivity returns.
export function scheduleSnapshotRefresh(refresh, {
  interval = 3_600_000, retryInterval = 60_000,
  events = window, visibility = document,
  setTimer = setTimeout, clearTimer = clearTimeout,
} = {}) {
  let timer, running = false, stopped = false;
  async function run() {
    if (running || stopped) return;
    running = true;
    clearTimer(timer);
    let success = false;
    try { success = await refresh(); } catch { /* Retry on the next timer. */ }
    finally {
      running = false;
      if (!stopped) timer = setTimer(run, success ? interval : retryInterval);
    }
  }
  const resume = () => { if (visibility.visibilityState !== 'hidden') run(); };
  events.addEventListener('online', resume);
  visibility.addEventListener('visibilitychange', resume);
  run();
  return () => {
    stopped = true;
    clearTimer(timer);
    events.removeEventListener('online', resume);
    visibility.removeEventListener('visibilitychange', resume);
  };
}
