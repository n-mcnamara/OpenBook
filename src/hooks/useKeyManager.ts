import { useEffect } from 'react';
import { NDKEvent, NDKKind, NDKSubscription } from '@nostr-dev-kit/ndk';
import ndk from '../lib/ndk';
import { useUserStore } from '../lib/store';
import { storeReceivedKey } from '../lib/ShelfKeyManager';
import eventBus from '../lib/EventBus';

const LAST_DM_CHECK_KEY = 'openbook_last_dm_check';

export function useKeyManager() {
  const { user } = useUserStore();

  useEffect(() => {
    if (!user) return;

    let sub: NDKSubscription | undefined;

    const setupSubscription = () => {
      console.log("Key Manager: NDK connected, setting up subscription.");
      const lastCheck = localStorage.getItem(LAST_DM_CHECK_KEY);
      const since = lastCheck ? parseInt(lastCheck) : Math.floor(Date.now() / 1000) - 3600;
      let latestEventTime = since;

      sub = ndk.subscribe({
        kinds: [44 as NDKKind],
        '#p': [user.pubkey],
        since,
      });

      sub.on('event', async (event: NDKEvent) => {
        if (event.pubkey === user.pubkey) return;
        if (event.tagValue('t') !== 'openbook:shelf:grant') return;

        console.log(`Key Manager: Received a potential shelf grant event from ${event.pubkey}`);

        if (event.created_at && event.created_at > latestEventTime) {
          latestEventTime = event.created_at;
        }

        try {
          // @ts-ignore
          if (!window.nostr || !window.nostr.nip44) {
            throw new Error("NIP-44 is not available on the window.nostr object for decryption.");
          }

          // Bypass NDK and use the NIP-07 window.nostr object directly
          // @ts-ignore
          const decryptedContent = await window.nostr.nip44.decrypt(event.pubkey, event.content);
          const data = JSON.parse(decryptedContent);

          if (data.type === 'shelf-access-grant' && data.shelfKey) {
            console.log(`Key Manager: Successfully decrypted and stored shelf key from ${event.pubkey}`);
            storeReceivedKey(event.pubkey, data.shelfKey);
            eventBus.emit('key-received', event.pubkey);
          }
        } catch (e) {
          console.error("Key Manager: Failed to decrypt event.", e);
        }
      });

      sub.on('eose', () => {
        console.log("Key Manager: Subscription EOSE.");
        localStorage.setItem(LAST_DM_CHECK_KEY, (latestEventTime + 1).toString());
      });
    };

    // Wait for NDK to connect before setting up the subscription
    ndk.pool.on('connect', setupSubscription);

    // If NDK is already connected, set it up immediately
    if (ndk.pool.stats().connected > 0) {
      setupSubscription();
    }

    return () => {
      console.log("Key Manager: Cleaning up subscription.");
      ndk.pool.off('connect', setupSubscription);
      if (sub) {
        sub.stop();
      }
    };
  }, [user]);
}
