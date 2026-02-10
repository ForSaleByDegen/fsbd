# Validator and User Safety

## Overview

Validators and users are protected through response validation, URL checks, and isolation rules.

## Response Validation (All Sources)

All AI responses (validator pool, in-house Ollama, Gemini) are validated before use:

- **Schema**: Required fields (itemDescription or suggestedTitle), valid JSON
- **Allowed values**: category in allowlist, subcategory in allowlist
- **Length limits**: Title 200, description 2000, price 50, token fields bounded
- **Content safety**: XSS/script patterns blocked (`<script>`, `javascript:`, `data:text/html`, etc.)
- **Price sanity**: Must be numeric, 0–1e9 range

See [lib/validator-response-validate.ts](lib/validator-response-validate.ts).

## Validator Isolation (No Cross-Up)

### Endpoint validators (current)

- Each validator is called independently, one at a time
- No response mixing: one request → one response → validate → use or discard
- URL filter: only `http://` or `https://`; blocks `file://`, etc.
- Empty or malformed `endpoint_url` filtered out before calling

### Browser validators (future job queue)

When implementing the job queue, use:

- **Atomic claim**: `UPDATE validator_jobs SET status='claimed', validator_wallet=$1, claimed_at=now() WHERE status='pending' RETURNING *` so only one validator gets each job
- **Job–validator binding**: Store `validator_wallet` on claim; only that wallet may submit the result for that job
- **Timeouts**: Mark jobs as `timeout` if not completed within a TTL; do not reuse

## Multiple Data Points Before Submitting

- Validation runs on every AI response before it is returned to the user
- Invalid responses are rejected (validator/inhouse fall through to next provider or Gemini)
- Fallback: if validation fails, a minimal safe object is used (itemDescription slice, category for-sale, subcategory other, empty keywords)
