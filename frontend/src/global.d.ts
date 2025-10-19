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

// Image file declarations
declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}
