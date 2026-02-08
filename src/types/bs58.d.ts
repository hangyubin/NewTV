declare module 'bs58' {
  /**
   * Encode a buffer to base58
   */
  export function encode(input: Buffer | Uint8Array): string;

  /**
   * Decode a base58 string to buffer
   */
  export function decode(input: string): Buffer;
}
