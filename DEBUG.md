# Troubleshooting: Empty Email Bodies

## Checklist for Theo's Setup

### 1. Verify RESEND_API_KEY is Valid
```bash
# Check if key is loaded
resendld status

# Test key directly
curl -s -H "Authorization: Bearer $RESEND_API_KEY" \
  https://api.resend.com/emails/receiving | jq '.data | length'
```

If this returns 0 or errors → **API key is invalid/expired.**

### 2. Check Email List Has Bodies
```bash
# Test the full email fetch
curl -s -H "Authorization: Bearer $RESEND_API_KEY" \
  https://api.resend.com/emails/receiving | jq '.data[0].id'

# Then fetch that email by ID
EMAIL_ID="<from above>"
curl -s -H "Authorization: Bearer $RESEND_API_KEY" \
  https://api.resend.com/emails/receiving/$EMAIL_ID | jq '.text, .html'
```

If `.text` is empty or missing → **Resend API isn't storing bodies.**

### 3. Check Daemon Logs for Body Length
```bash
tail -f ~/.local/bin/resendld/logs/daemon.log | grep "Body:"
```

Should show `Body: 150 chars` or similar. If `Body: 0 chars` → **body wasn't in API response.**

### 4. Verify ENV Variables Are Set
```bash
echo "RESEND_API_KEY: ${RESEND_API_KEY:-(not set)}"
echo "OPENCLAW_HOOKS_TOKEN: ${OPENCLAW_HOOKS_TOKEN:-(not set)}"
echo "OPENCLAW_GATEWAY_URL: ${OPENCLAW_GATEWAY_URL:-(not set)}"
```

### 5. Manual Test: Send Email + Monitor
```bash
# Terminal 1: Watch daemon logs
tail -f ~/.local/bin/resendld/logs/daemon.log

# Terminal 2: Send test email
echo "Test body content" | mail -s "Test Subject" theo@uncap.us

# Check daemon output for "Body: X chars"
```

## Fix: Fallback to HTML if Text Missing

If Resend is only returning `.html` (not `.text`), add this to listen.ts:

```typescript
const parsedEmail = {
  // ...
  body: (fullEmail.text || stripHtml(fullEmail.html) || "(no body)").toString(),
  // ...
};
```

## Next Steps

1. Run the `curl` tests above — report what you see
2. Check daemon logs for body character count
3. Verify both API keys are set
4. If still empty → may need to contact Resend support (API issue)
