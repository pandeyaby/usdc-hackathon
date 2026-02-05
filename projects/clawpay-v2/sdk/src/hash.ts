/**
 * Hash utilities for ClawPay escrow
 */

import { keccak256, toUtf8Bytes, hexlify } from 'ethers';
import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Hash a string using keccak256 (Ethereum standard)
 */
export function hashString(input: string): string {
  return keccak256(toUtf8Bytes(input));
}

/**
 * Hash a buffer using keccak256
 */
export function hashBuffer(input: Buffer): string {
  return keccak256(input);
}

/**
 * Hash a file using keccak256
 */
export function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return keccak256(content);
}

/**
 * Hash a file using SHA-256 (common for file verification)
 * Returns as bytes32 compatible hex string
 */
export function hashFileSha256(filePath: string): string {
  const content = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha256').update(content).digest();
  return hexlify(hash);
}

/**
 * Hash JSON object (deterministic)
 */
export function hashJson(obj: object): string {
  const normalized = JSON.stringify(obj, Object.keys(obj).sort());
  return hashString(normalized);
}

/**
 * Hash multiple items into a single hash (simple concatenation)
 */
export function hashMultiple(...inputs: string[]): string {
  return keccak256(toUtf8Bytes(inputs.join('')));
}

/**
 * Verify that two hashes match
 */
export function verifyHash(expected: string, actual: string): boolean {
  return expected.toLowerCase() === actual.toLowerCase();
}

/**
 * Create a commitment hash (for commit-reveal schemes)
 */
export function createCommitment(secret: string, value: string): string {
  return keccak256(toUtf8Bytes(secret + value));
}
