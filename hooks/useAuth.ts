import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UseAuthReturn {
    user: User | null;
    role: string | null;
    loading: boolean;
    signInWithGoogle: (redirectTo?: string) => Promise<void>;
    signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        const getInitialSession = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();
                    setRole(profile?.role || null);
                }
            } catch (error) {
                console.error('Error getting user:', error);
            } finally {
                setLoading(false);
            }
        };

        getInitialSession();

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    setRole(profile?.role || null);
                } else {
                    setRole(null);
                }
                setLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signInWithGoogle = async (redirectTo?: string) => {
        // Store redirect path for after auth
        if (redirectTo) {
            sessionStorage.setItem('auth_redirect', redirectTo);
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth-callback`,
            },
        });

        if (error) {
            throw error;
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
        setUser(null);
    };

    return { user, role, loading, signInWithGoogle, signOut };
}

export default useAuth;
