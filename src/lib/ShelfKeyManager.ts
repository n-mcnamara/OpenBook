// This file manages the storage of shelf keys received from other users.
// Keys are stored in localStorage, mapped by the owner's pubkey.

const RECEIVED_KEYS_NAME = 'openbook_received_shelf_keys';

/**
 * Retrieves the map of received shelf keys from local storage.
 * @returns {Record<string, string>} A map of pubkeys to their shelf key JWK.
 */
function getReceivedKeys(): Record<string, string> {
  const stored = localStorage.getItem(RECEIVED_KEYS_NAME);
  return stored ? JSON.parse(stored) : {};
}

/**
 * Saves a new shelf key for a given user pubkey.
 * @param {string} ownerPubkey - The pubkey of the user who owns the shelf.
 * @param {JsonWebKey} keyJwk - The shelf key in JWK format.
 */
export function storeReceivedKey(ownerPubkey: string, keyJwk: JsonWebKey): void {
  const keys = getReceivedKeys();
  keys[ownerPubkey] = JSON.stringify(keyJwk);
  localStorage.setItem(RECEIVED_KEYS_NAME, JSON.stringify(keys));
}

/**
 * Retrieves a specific user's shelf key.
 * @param {string} ownerPubkey - The pubkey of the shelf owner.
 * @returns {Promise<CryptoKey | null>} The CryptoKey if found, otherwise null.
 */
export async function getFriendShelfKey(ownerPubkey: string): Promise<CryptoKey | null> {
  const keys = getReceivedKeys();
  const keyJwkString = keys[ownerPubkey];
  if (!keyJwkString) return null;

  try {
    const jwk = JSON.parse(keyJwkString);
    return await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM' },
      true,
      ['decrypt']
    );
  } catch (e) {
    console.error("Failed to import friend's shelf key:", e);
    return null;
  }
}
