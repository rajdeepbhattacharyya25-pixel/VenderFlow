
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const EMAIL = "rajdeep.bhattacharyya25@gmail.com";

async function genLink() {
    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: EMAIL,
        options: {
            redirectTo: 'http://localhost:3000/auth-callback'
        }
    });

    if (error) {
        console.error(error);
    } else {
        console.log("LINK:", data.properties.action_link);
    }
}

genLink();
