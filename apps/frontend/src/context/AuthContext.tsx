'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, getIdToken } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    token: null,
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const jwt = await getIdToken(currentUser, true);
                setToken(jwt);
                localStorage.setItem('admin_token', jwt);
            } else {
                setUser(null);
                setToken(null);
                localStorage.removeItem('admin_token');
            }
            setLoading(false);
        });

        // Optional: refresh token every 10 mins
        const interval = setInterval(async () => {
            if (auth.currentUser) {
                const rt = await getIdToken(auth.currentUser, true);
                setToken(rt);
                localStorage.setItem('admin_token', rt);
            }
        }, 10 * 60 * 1000);

        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
