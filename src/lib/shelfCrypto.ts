// This file uses the browser's built-in Web Crypto API.
// It is available in all modern browsers under `window.crypto` or `crypto`.

// We are using localStorage to keep this simple for the demo.
// A more advanced implementation would use NIP-44 to encrypt this key
// before storing it, but this is a secure starting point.

const SHELF_KEY_NAME = 'openbook_shelf_key';

/**
 * Retrieves the user's private shelf key from local storage.
 * If it doesn't exist, it generates a new one and saves it.
 * @returns {Promise<CryptoKey>} The user's shelf key.
 */
export async function getSelfShelfKey(): Promise<CryptoKey> {
  const storedKey = localStorage.getItem(SHELF_KEY_NAME);
  if (storedKey) {
    const jwk = JSON.parse(storedKey);
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM' },
      true,
      ['encrypt', 'decrypt']
    );
  }

  const newKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );

  const jwk = await crypto.subtle.exportKey('jwk', newKey);
  localStorage.setItem(SHELF_KEY_NAME, JSON.stringify(jwk));

  return newKey;
}

/**
 * Encrypts a string content using the provided AES-GCM key.
 * @param {string} content - The plaintext content to encrypt.
 * @param {CryptoKey} key - The AES-GCM key to use for encryption.
 * @returns {Promise<string>} A base64-encoded string containing the IV and ciphertext.
 */
export async function encryptShelfItem(content: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedContent = new TextEncoder().encode(content);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedContent
  );

  // Combine IV and ciphertext for storage, and base64-encode it
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

/**
 * Decrypts a base64-encoded string using the provided AES-GCM key.
 * @param {string} encryptedContentB64 - The base64-encoded encrypted content.
 * @param {CryptoKey} key - The AES-GCM key to use for decryption.
 * @returns {Promise<string>} The decrypted plaintext content.
 */
export async function decryptShelfItem(encryptedContentB64: string, key: CryptoKey): Promise<string> {
  const combined = new Uint8Array(atob(encryptedContentB64).split('').map(c => c.charCodeAt(0)));
  
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decryptedContent = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedContent);
}
