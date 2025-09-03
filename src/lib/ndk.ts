import NDK from '@nostr-dev-kit/ndk';

const ndk = new NDK({
    explicitRelayUrls: [
        'wss://relay.damus.io',
        'wss://relay.primal.net',
        'wss://nos.lol',
        'wss://relay.snort.social',
        'wss://nostr.wine',
        'wss://relay.nostr.band',
    ],
});

export default ndk;
