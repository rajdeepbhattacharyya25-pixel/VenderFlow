import { supabase } from './supabase';

export async function googleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/auth-callback`,
        },
    });

    if (error) {
        throw error;
    }
}

export async function checkRoleAndRedirect() {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return '/login';

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (error || !profile) {
        // If no profile, we assume customer but might want to handle it
        return '/';
    }

    if (profile.role === 'admin') {
        return '/admin';
    } else if (profile.role === 'seller') {
        return '/dashboard';
    } else {
        return '/';
    }
}
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        throw error;
    }
}
