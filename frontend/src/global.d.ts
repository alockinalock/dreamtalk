/**
 * Ambient module declarations for packages without types.
 * Place minimal shapes here to satisfy the TypeScript compiler.
 * This does NOT change runtime behavior; `mic` is still a Node-only module.
 */

declare module 'mic' {
  export type MicOptions = {
    rate?: string | number;
    channels?: string | number;
    bitwidth?: string | number;
    encoding?: string;
    device?: string;
    exitOnSilence?: number | boolean;
    // allow other options
  [k: string]: unknown;
  };

  export type MicInstance = {
  getAudioStream: () => NodeJS.ReadableStream & { on: (ev: string, cb: (...args: unknown[]) => void) => void };
    start: () => void;
    stop: () => void;
    // some versions expose pause/resume
    pause?: () => void;
    resume?: () => void;
  };

  function mic(options?: MicOptions): MicInstance;

  export default mic;
}

// allow importing the package without types elsewhere
declare module 'mic/*';
