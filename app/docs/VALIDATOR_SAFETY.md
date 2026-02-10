# Validator Safety

## Overview

Validators and users are protected by multiple checks before listing suggestions are accepted.

## Validator Isolation (No Cross-Up)

### Endpoint Validators (current)

- Each validator is called **independently** — one request, one response, no mixing.
- Only validators with non-empty `endpoint_url` and safe `http`/`https` URLs are used.
- Invalid responses are discarded; we try the next validator or fall back to Gemini.
- URL validation: only `http://` or `https://` schemes; blocks `file://`, `data:`, etc.

### Browser Validators (future job queue)

When implementing the job queue for browser validators:

1. **Atomic claim**: Use `UPDATE validator_jobs SET status='claimed', validator_wallet=?, claimed_at=now() WHERE status='pending' AND id=? RETURNING *` so only one validator gets each job.
2. **Job–validator binding**: Store `validator_wallet` on claim; only that wallet can complete the job.
3. **Complete endpoint**: `POST /api/validators/jobs/:id/complete` must verify `wallet` matches `validator_wallet` for that job.

## Response Validation (User Safety)

All AI responses (validator, in-house, Gemini) pass through `parseAndValidateValidatorResponse`:

- **Schema**: Required fields (itemDescription or suggestedTitle), valid JSON.
- **Allowed values**: Category and subcategory must be from whitelists.
- **Length limits**: Title, description, keywords, etc. capped to prevent overflow.
- **Content safety**: Blocks XSS/injection patterns (`<script>`, `javascript:`, `data:text/html`, etc.).
- **Price validation**: Must parse as number in range 0–1e9.

If validation fails, a safe fallback is used (minimal fields, default category/subcategory).
