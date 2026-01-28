
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") || "";
const SUPABASE_KEY = Deno.env.get("VITE_SUPABASE_ANON_KEY") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing env vars");
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const EMAIL = "rajdeep.bhattacharyya25@gmail.com";

async function checkUser() {
    console.log(`Checking user: ${EMAIL}...`);

    // 1. Get Auth User
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
        console.error("Auth list error:", userError.message);
        return;
    }

    const user = users.find(u => u.email?.toLowerCase() === EMAIL.toLowerCase());

    if (!user) {
        console.error("User not found in Auth!");
        return;
    }

    console.log("Auth User Found:", { id: user.id, email: user.email });

    // 2. Get Profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Profile fetch error:", profileError.message);
        return;
    }

    if (!profile) {
        console.error("Profile not found!");
    } else {
        console.log("Profile Data:", profile);
        console.log("Role:", profile.role);
        console.log("Is Admin?", profile.role === 'admin');
    }
}

checkUser();
