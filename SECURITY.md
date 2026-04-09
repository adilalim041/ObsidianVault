# SECURITY — what is forbidden in this vault

## NEVER write into the vault

- API keys (any service)
- Tokens (Telegram bot tokens, GitHub tokens, OAuth tokens)
- Passwords
- JWTs (anything starting with `eyJ`) — even "anon" Supabase keys
- Database connection strings with embedded credentials (`postgres://user:password@host/db`)
- `.env` file contents
- Supabase service role keys (CRITICAL — these bypass RLS)
- WhatsApp session files / auth state
- Private SSH keys, PEM files
- Cloud provider credentials (AWS, GCP, Azure)
- Any value that, if leaked, would give someone access to a real account

## Use placeholders instead

Good: `SUPABASE_URL=<SUPABASE_URL>` or `client = createClient('<URL>', '<KEY>')`
Bad: `client = createClient('https://abc.supabase.co', 'eyJhbGc...')`

## Where real secrets live

- `wa-bridge/.env` (gitignored)
- `news-project/*/`.env (each subservice, gitignored)
- `AbdAdl/.env` (gitignored)
- Railway/Vercel environment variables (web dashboards)

The vault references their **existence and purpose**, never their **values**.

## Safety net

A pre-write hook scans Write/Edit operations for common secret patterns and blocks them if detected. If the hook fires on a legitimate file, that means the file has a secret in it — fix the file, do not bypass the hook.

## If a secret leaks into the vault by accident

1. Stop. Do not commit, do not sync.
2. Remove the secret from the file.
3. **Rotate the leaked credential** at the source (Supabase dashboard, OpenAI dashboard, etc.) — assume it is compromised.
4. Search the vault for the same pattern in case it appears elsewhere.
