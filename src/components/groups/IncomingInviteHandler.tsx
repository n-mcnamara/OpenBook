import { useEffect } from 'react';
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import ndk from '../../lib/ndk';
import { useUserStore } from '../../lib/store';
import { storeReceivedKey } from '../../lib/ShelfKeyManager';

// This component has no UI. It runs in the background to listen for
// and process incoming shelf invitations via NIP-04 DMs.

export default function IncomingInviteHandler() {
  const { user } = useUserStore();

  useEffect(() => {
    if (!user) return;

    const sub = ndk.subscribe({
      kinds: [NDKKind.EncryptedDirectMessage],
      '#p': [user.pubkey],
    });

    sub.on('event', async (event: NDKEvent) => {
      try {
        // We only care about DMs sent from another user to us.
        if (event.pubkey === user.pubkey) return;

        // Decrypt the DM content
        await event.decrypt(user);
        const dmContent = JSON.parse(event.content);

        // Check if it's a valid shelf access grant
        if (dmContent.type === 'shelf-access-grant' && dmContent.shelfKey) {
          console.log(`Received shelf access grant from ${event.pubkey}`);
          storeReceivedKey(event.pubkey, dmContent.shelfKey);
          // Optional: We could show a notification to the user here.
        }
      } catch (e) {
        // It's normal for decryption to fail if the DM wasn't intended for us
        // or if it's not valid JSON, so we can often ignore these errors.
        // console.error("Could not process incoming DM:", e);
      }
    });

    return () => sub.stop();
  }, [user]);

  return null; // This component does not render anything
}
