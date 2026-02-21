/**
 * verify_user_role.ts
 * 
 * Admin role verification utility.
 * 
 * USAGE: Set credentials via environment variables, never hardcode them.
 * 
 *   ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=your_password npx tsx scripts/verify_user_role.ts
 */

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
        let val = value.trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        envVars[key.trim()] = val;
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD environment variables.');
        console.error('Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=*** npx tsx scripts/verify_user_role.ts');
        process.exit(1);
    }

    console.log(`🔍 Attempting to login as ${email}...`);

    const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
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
