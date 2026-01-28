
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        // Remove quotes if present
        let val = value.trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        envVars[key.trim()] = val;
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY; // Using anon key, hoping RLS allows read. If not, implies RLS issue.

// Wait, if RLS blocks read, this script will fail (return empty or error).
// But I need to check if the user *exists* and has *role*.
// To bypass RLS, I should use SERVICE_ROLE_KEY if available.
// But it's not in .env.local usually.
// I'll try with ANON key first. My fix 20260127083000_fix_profiles_rls.sql allows users to read their OWN profile.
// But this script is NOT authenticated as the user. It's authenticated as ANON.
// So RLS will block it!
// I need data.

// Ah, the script can query `auth.users` via `supabase.auth.admin` if I had service key.
// But I don't.

// BUT, I can query with the user's EMAIL/PASSWORD to simulate login and THEN check profile?
// Yes.

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    console.log('🔍 Attempting to login as rajdeep.bhattacharyya25@gmail.com...');

    // Attempt Login
    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'rajdeep.bhattacharyya25@gmail.com',
        password: 'rick2007' // User provided this password earlier
    });

    if (loginError) {
        console.error("❌ Login Failed:", loginError.message);
        return;
    }

    if (!user) {
        console.error("❌ User not found after login?");
        return;
    }

    console.log(`✅ Login Successful! User ID: ${user.id}`);

    // Now check profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (profileError) {
        console.error("❌ Profile Fetch Error:", profileError);
    } else if (!profile) {
        console.error("❌ Profile is NULL (RLS or Missing Data)");
    } else {
        console.log("✅ Profile Found:", profile);
        if (profile.role === 'admin') {
            console.log("🎉 ROLE IS ADMIN. Logic should work.");
        } else {
            console.log(`⚠️ ROLE IS: '${profile.role}' (Expected 'admin')`);
        }
    }
}

checkUser();
