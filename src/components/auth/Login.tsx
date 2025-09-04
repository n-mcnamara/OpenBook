import { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import ndk from '../../lib/ndk';
import { useUserStore } from '../../lib/store';
import { useState } from 'react';

export default function Login() {
    const { user, setUser } = useUserStore();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLogin = async () => {
        if (isLoggingIn) return;
        setIsLoggingIn(true);

        const attemptLogin = async () => {
            try {
                const nip07signer = new NDKNip07Signer(3000);
                ndk.signer = nip07signer;
                const user = await nip07signer.user();
                
                if (user) {
                    setUser(user);
                    setIsLoggingIn(false);
                    return true;
                }
            } catch (e) {
                console.error("Attempt to login with NIP-07 failed", e);
            }
            return false;
        };

        if (await attemptLogin()) {
            return;
        }

        // If the first attempt fails, wait a bit and try again for nos2x
        setTimeout(async () => {
            if (!(await attemptLogin())) {
                alert("Login failed. Please ensure your extension is unlocked and that you have granted permissions for this site. It may help to reset site permissions in your extension's settings.");
                setIsLoggingIn(false);
            }
        }, 500);
    };

    const handleLogout = () => {
        ndk.signer = undefined;
        setUser(null);
    };

    if (user) {
        return (
            <div>
                <span>Welcome, {user.npub.substring(0, 12)}...</span>
                <button onClick={handleLogout}>Logout</button>
            </div>
        );
    }

    return <button onClick={handleLogin} disabled={isLoggingIn}>
        {isLoggingIn ? 'Logging in...' : 'Login with Extension'}
    </button>;
}
