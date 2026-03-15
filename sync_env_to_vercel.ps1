$vars = @{
    "VITE_SUPABASE_URL" = "https://gqwgvhxcssooxbmwgiwt.supabase.co"
    "VITE_SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxd2d2aHhjc3Nvb3hibXdnaXd0In0.GWS2jdWY9lR3dGMOeip52U6DAM6WaWHhI"
    "VITE_GOOGLE_CLIENT_ID" = "874589373565-0i10mss6d1pgsgl1qp7n4tum6llj8ilj.apps.googleusercontent.com"
    "VITE_GOOGLE_API_KEY" = "AIzaSyDc6jr1CgEOqul5TC1Y2J3wHL_8Skz1-DQ"
    "TELEGRAM_BOT_TOKEN" = "8200605396:AAHiBrmO2FbmaWitwtXmraRy1frcObjPjJg"
    "TELEGRAM_CHAT_ID" = "1404261962"
    "VITE_POSTHOG_API_KEY" = "phc_AUzqy5s9m7Zd8zWxZKukrWBo2hVgLQEGm7rja8dwJCV"
    "VITE_POSTHOG_HOST" = "https://app.posthog.com"
    "VITE_IMGBB_API_KEY" = "56be5ba44debe2fdb0e466490aceeaeb"
    "BREVO_API_KEY" = "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"
    "RAZORPAY_KEY_ID" = "rzp_test_SQlIZW2wHIsqyt"
    "RAZORPAY_KEY_SECRET" = "HQtDzI00ery8fJpvHnguNiRe"
    "GEMINI_API_KEY" = "AIzaSyDqPL-z17ccJxAPBsh6IGWpAG3dzik0NBk"
    "GROQ_API_KEY" = "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"
}

foreach ($key in $vars.Keys) {
    $val = $vars[$key]
    Write-Host "Syncing $key..."
    foreach ($env in @("production", "preview", "development")) {
        Write-Host "  - Adding to $env"
        if ($key -like "VITE_*") {
            # 1. sensitive? (N)
            # 2. value? ($val)
            # 3. Rename? (Enter)
            Write-Output "N", $val, "" | npx vercel env add $key $env
        } else {
            # 1. value? ($val)
            Write-Output $val | npx vercel env add $key $env
        }
    }
}
