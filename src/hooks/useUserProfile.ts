import { useState, useEffect } from 'react';
import { NDKUser } from '@nostr-dev-kit/ndk';
import ndk from '../lib/ndk';

// Define the structure of a user profile based on NIP-01
export interface NDKUserProfile {
    name?: string;
    displayName?: string;
    image?: string;
    banner?: string;
    bio?: string;
    website?: string;
    lud16?: string;
    about?: string;
    [key: string]: any;
}

const userCache = new Map<string, NDKUserProfile>();

export function useUserProfile(pubkey?: string) {
  const [profile, setProfile] = useState<NDKUserProfile | null>(userCache.get(pubkey || '') || null);

  useEffect(() => {
    if (!pubkey) return;
    if (userCache.has(pubkey)) {
      setProfile(userCache.get(pubkey)!);
      return;
    }

    const user = new NDKUser({ pubkey });
    user.ndk = ndk;

    user.fetchProfile().then((profile) => {
      if (profile) {
        userCache.set(pubkey, profile);
        setProfile(profile);
      }
    });
  }, [pubkey]);

  return profile;
}