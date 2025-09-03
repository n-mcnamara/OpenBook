import { NDKNip07Signer } from '@nostr-dev-kit/ndk';
import ndk from '../../lib/ndk';
import { useUserStore } from '../../lib/store';

export default function Login() {
    const { user, setUser } = useUserStore();

    const handleLogin = async () => {
        try {
            const nip07signer = new NDKNip07Signer();
            ndk.signer = nip07signer;
            await nip07signer.user().then((user) => {
                if (user) {
                    setUser(user);
                }
            });
        } catch (e) {
            console.error("Failed to login with NIP-07", e);
            alert("Failed to login. Make sure you have a NIP-07 extension installed.");
        }
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

    return <button onClick={handleLogin}>Login with Extension</button>;
}
