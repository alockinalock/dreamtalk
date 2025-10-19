// Browser shim for audio extractor used by the frontend.
// This file intentionally avoids importing any Node-only modules.
// It provides ae_start/ae_stop wrappers that call backend endpoints.

export const ae_start = async (): Promise<void> => {
  try {
    // Call backend endpoint -- implement this route on the server
    await fetch('/api/audio/start', { method: 'POST' });
  } catch (err) {
    console.warn('ae_start shim: failed to call /api/audio/start, no-op', err);
  }
};

export const ae_stop = async (): Promise<void> => {
  try {
    await fetch('/api/audio/stop', { method: 'POST' });
  } catch (err) {
    console.warn('ae_stop shim: failed to call /api/audio/stop, no-op', err);
  }
};

export default { ae_start, ae_stop };
