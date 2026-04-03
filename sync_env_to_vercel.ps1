$vars = @{
    "VITE_SUPABASE_URL" = "https://gqwgvhxcssooxbmwgiwt.supabase.co"
    "VITE_SUPABASE_ANON_KEY" = "sb_publishable_541nyiJYSE4KzqH88snw0w_i5ru8-dI"
    "VITE_DISPATCHER_SECRET" = "vf_disp_8k2m9p_q4z8"
    "VITE_GOOGLE_CLIENT_ID" = "952595241784-3q6eeqbiesufm3p2mug4jplo462l66bn.apps.googleusercontent.com"
    "VITE_GOOGLE_API_KEY" = "[SECRET]"
    "TELEGRAM_BOT_TOKEN" = "8200605396:AAHiBrmO2FbmaWitwtXmraRy1frcObjPjJg"
    "TELEGRAM_CHAT_ID" = "1404261962"
    "VITE_POSTHOG_API_KEY" = "[SECRET]"
    "VITE_POSTHOG_HOST" = "https://app.posthog.com"
    "VITE_IMGBB_API_KEY" = "28f78edd0fca256475ccdb64401bc73e"
    "BREVO_API_KEY" = "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"
    "RAZORPAY_KEY_ID" = "rzp_test_SQlIZW2wHIsqyt"
    "RAZORPAY_KEY_SECRET" = "HQtDzI00ery8fJpvHnguNiRe"
    "GEMINI_API_KEY" = "[SECRET]"
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
        npx -y vercel env rm $key $env -y 2>$null
        
        # 2. Add the variable without trailing newlines
        # We use [System.IO.File]::WriteAllText to ensure NO newline at the end
        $tempFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tempFile, $val)
        
        try {
            # Add the variable using the --value flag to ensure zero newline issues
            # We use --yes to skip ALL prompts
            npx -y vercel env add $key $env --value "$val" --yes
        } finally {
            if (Test-Path $tempFile) { Remove-Item $tempFile }
        }
    }
}
