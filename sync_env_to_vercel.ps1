$vars = @{
    "VITE_SUPABASE_URL" = "https://gqwgvhxcssooxbmwgiwt.supabase.co"
    "VITE_SUPABASE_ANON_KEY" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdxd2d2aHhjc3Nvb3hibXdnaXd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NjczMjAsImV4cCI6MjA4MDQ0MzMyMH0.TYY0G0XRICGWS2jdWY9lR3dGMOeip52U6DAM6WaWHhI"
    "VITE_GOOGLE_CLIENT_ID" = "952595241784-3q6eeqbiesufm3p2mug4jplo462l66bn.apps.googleusercontent.com"
    "VITE_GOOGLE_API_KEY" = "AIzaSyDc6jr1CgEOqul5TC1Y2J3wHL_8Skz1-DQ"
    "TELEGRAM_BOT_TOKEN" = "8200605396:AAHiBrmO2FbmaWitwtXmraRy1frcObjPjJg"
    "TELEGRAM_CHAT_ID" = "1404261962"
    "VITE_POSTHOG_API_KEY" = "phc_AUzqy5s9m7Zd8zWxZKukrWBo2hVgLQEGm7rja8dwJCV"
    "VITE_POSTHOG_HOST" = "https://app.posthog.com"
    "VITE_IMGBB_API_KEY" = "28f78edd0fca256475ccdb64401bc73e"
    "BREVO_API_KEY" = "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"
    "RAZORPAY_KEY_ID" = "rzp_test_SQlIZW2wHIsqyt"
    "RAZORPAY_KEY_SECRET" = "HQtDzI00ery8fJpvHnguNiRe"
    "GEMINI_API_KEY" = "AIzaSyDqPL-z17ccJxAPBsh6IGWpAG3dzik0NBk"
    "GROQ_API_KEY" = "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"
    "OPENROUTER_API_KEY" = "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"
    "VITE_TURNSTILE_SITEKEY" = "1x00000000000000000000AA"
}


foreach ($key in $vars.Keys) {
    $val = $vars[$key]
    Write-Host "Syncing $key..."
    foreach ($env in @("production", "preview", "development")) {
        Write-Host "  - Syncing $key to $env..."
        
        # 1. First remove the existing variable (ignore errors if it doesn't exist)
        npx vercel env rm $key $env -y 2>$null
        
        # 2. Add the variable
        if ($key -like "VITE_*") {
            # VITE_* variables: Non-sensitive, value, no rename
            Write-Output "N", $val, "" | npx vercel env add $key $env
        } else {
            # Other variables: value
            Write-Output $val | npx vercel env add $key $env
        }
    }
}
