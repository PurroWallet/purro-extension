import { Buffer } from 'buffer';

// Make Buffer globally available
(globalThis as any).Buffer = Buffer;

export { Buffer }; 