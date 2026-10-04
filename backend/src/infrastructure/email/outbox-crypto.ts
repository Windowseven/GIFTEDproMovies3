import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export class PayloadDecryptionError extends Error {
  constructor(message: string, cause?: unknown) {
    super(`Payload decryption error: ${message}`, { cause });
    this.name = "PayloadDecryptionError";
  }
}

export interface EncryptedPayloadBundle {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts arbitrary serializable data using AES-256-GCM with a unique 96-bit IV.
 * @param data Data to encrypt (object, string, etc.)
 * @param encryptionKeyHex 64-character hexadecimal string representing a 256-bit key
 */
export function encryptOutboxPayload(
  data: unknown,
  encryptionKeyHex: string,
): EncryptedPayloadBundle {
  if (!encryptionKeyHex || !/^[0-9a-fA-F]{64}$/.test(encryptionKeyHex)) {
    throw new Error("Invalid encryption key: must be a 64-hexadecimal character (256-bit) string");
  }

  const key = Buffer.from(encryptionKeyHex, "hex");
  const iv = randomBytes(12); // Standard 96-bit nonce for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const serialized = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(serialized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

/**
 * Decrypts and deserializes an AES-256-GCM encrypted payload.
 * Verifies the 128-bit authentication tag before returning.
 * @param bundle Encrypted payload containing ciphertext, iv, and auth tag
 * @param encryptionKeyHex 64-character hexadecimal string representing a 256-bit key
 */
export function decryptOutboxPayload<T = unknown>(
  bundle: EncryptedPayloadBundle,
  encryptionKeyHex: string,
): T {
  if (!encryptionKeyHex || !/^[0-9a-fA-F]{64}$/.test(encryptionKeyHex)) {
    throw new PayloadDecryptionError("Invalid encryption key format");
  }

  try {
    const key = Buffer.from(encryptionKeyHex, "hex");
    const iv = Buffer.from(bundle.iv, "hex");
    const tag = Buffer.from(bundle.tag, "hex");
    const ciphertext = Buffer.from(bundle.ciphertext, "hex");

    if (iv.length !== 12) {
      throw new PayloadDecryptionError(`Invalid IV length: expected 12 bytes, got ${iv.length}`);
    }
    if (tag.length !== 16) {
      throw new PayloadDecryptionError(`Invalid auth tag length: expected 16 bytes, got ${tag.length}`);
    }

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch (error: unknown) {
    if (error instanceof PayloadDecryptionError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Decryption failed";
    throw new PayloadDecryptionError(message, error);
  }
}
