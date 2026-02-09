# First-Party Listing Lookup (No 3rd Party APIs)

We look up listings using **only our own database (Supabase)**. No external search or AI APIs are required for discovery.

## How It Works

### GET /api/listings (search)

- **Query params**: `q`, `category`, `subcategory`, `delivery`, `location_city`, `location_region`, `listed`, `sort`
- **When `q` is provided**:
  1. **Title/description**: We match listings where `title` or `description` contains the search string (case-insensitive, Supabase `ilike`).
  2. **Search keywords**: We split `q` into tokens (words) and match listings whose `search_keywords` array **overlaps** with those tokens (Supabase `overlaps`). So a listing with keywords `["vintage","lamp"]` will appear when the user searches "vintage lamp" or "lamp".
- Results from both (title/description and keywords) are merged, deduplicated by listing id, sorted (newest or oldest), and limited to 100. All filters (category, delivery, location, listed date) apply to both branches.
- **No 3rd parties**: All data comes from the `listings` table in Supabase.

### Snap to Compare — keyword-only path

- In Snap to Compare, users can **search by keywords** (no photo). That flow calls `GET /api/listings?q=...` and displays the results as comps. No image, no Gemini, no external API. Fully first-party.

### Snap to Compare — image path (uses Gemini today)

- When the user uploads a **photo**, we currently use Google Gemini to get suggested title, description, keywords, etc., then we **look up comps from our DB** using those keywords (same Supabase query by title/description and `search_keywords`). The only 3rd party in that path is Gemini (and optional Google Search grounding). The **listing lookup** itself is first-party.
- Future: run vision/LLM in-house so the whole flow is first-party; then we can relax the 1 AI listing/day limit.

## Data We Use

- **listings**: `id`, `title`, `description`, `search_keywords` (TEXT[]), `category`, `subcategory`, `status`, `created_at`, `delivery_method`, `location_city`, `location_region`, etc.
- **search_keywords**: Stored when creating/editing a listing (from AI suggestions or manual). Used for overlap search so buyers can find listings by tags without relying on external search APIs.

## Possible Future Improvements

- **Full-text search**: Add a generated `tsvector` column (e.g. on `title || ' ' || description` and optionally `search_keywords::text`) and use Postgres full-text search for ranking and stemming. Still 100% first-party.
- **Embeddings**: Optionally store vector embeddings for title/description and do similarity search in Supabase (pgvector). Would require an embedding step (could be in-house or batch job) but **query** would be first-party.
- **In-house AI**: Replace Gemini with a self-hosted or local vision model for image → keywords; then the entire Snap to Compare flow is first-party.
