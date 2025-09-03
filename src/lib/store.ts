import { create } from 'zustand';
import { NDKUser } from '@nostr-dev-kit/ndk';

interface UserState {
  user: NDKUser | null;
  setUser: (user: NDKUser | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
