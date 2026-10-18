# Run this script in your terminal after logging in with: vercel login
# Usage: .\setup-vercel-env.ps1 -Token "your_vercel_token_here" -ProjectId "your_project_id"
# Or just: .\setup-vercel-env.ps1 (will use vercel CLI login)
#
# Fill in the values below before running. Do NOT commit real secrets to git.

param(
    [string]$Token = "",
    [string]$ProjectName = "shadow-tournaments"
)

$env_vars = @{
    "NEXT_PUBLIC_APP_URL"           = "https://shadow-tournaments.vercel.app"
    "DISCORD_REDIRECT_URI"          = "https://shadow-tournaments.vercel.app/api/auth/callback"
    "DISCORD_CLIENT_ID"             = "YOUR_DISCORD_CLIENT_ID"
    "DISCORD_CLIENT_SECRET"         = "YOUR_DISCORD_CLIENT_SECRET"
    "DATABASE_URL"                  = "YOUR_DATABASE_URL"
    "DIRECT_URL"                    = "YOUR_DIRECT_URL"
    "NEXT_PUBLIC_SUPABASE_URL"      = "YOUR_NEXT_PUBLIC_SUPABASE_URL"
    "SUPABASE_URL"                  = "YOUR_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY" = "YOUR_NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_ANON_KEY"             = "YOUR_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"     = "YOUR_SUPABASE_SERVICE_ROLE_KEY"
    "ENCRYPTION_KEY"                = "YOUR_ENCRYPTION_KEY"
    "PAYMENTS_ENABLED"              = "true"
    "UPSTASH_REDIS_REST_URL"        = "YOUR_UPSTASH_REDIS_REST_URL"
    "UPSTASH_REDIS_REST_TOKEN"      = "YOUR_UPSTASH_REDIS_REST_TOKEN"
    "DISCORD_BOT_TOKEN"             = "YOUR_DISCORD_BOT_TOKEN"
    "SENTRY_DSN_WEB"                = "YOUR_SENTRY_DSN_WEB"
    "NODE_ENV"                      = "production"
}

Write-Host "Setting Vercel environment variables for project: $ProjectName" -ForegroundColor Cyan
Write-Host ""

$tokenArg = if ($Token) { "--token=$Token" } else { "" }

foreach ($key in $env_vars.Keys) {
    $value = $env_vars[$key]
    Write-Host "Setting $key..." -ForegroundColor Yellow
    
    # Set for all environments (production, preview, development)
    $value | vercel env add $key production $tokenArg --yes 2>&1 | Out-Null
    $value | vercel env add $key preview $tokenArg --yes 2>&1 | Out-Null
    
    Write-Host "  ✓ $key set" -ForegroundColor Green
}

Write-Host ""
Write-Host "All environment variables set!" -ForegroundColor Green
Write-Host ""
Write-Host "Triggering new deployment..." -ForegroundColor Cyan
vercel deploy --prod $tokenArg
Write-Host ""
Write-Host "Done! Check https://shadow-tournaments.vercel.app" -ForegroundColor Green
