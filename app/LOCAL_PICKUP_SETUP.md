# Local Pickup and External Listings

## 1. Run the migration

In Supabase SQL Editor, run `supabase/migration_local_pickup.sql`:

```sql
-- Adds: delivery_method, location_city, location_region, external_listing_url to listings
```

## 2. Local pickup / meet in person

- **Create listing**: Sellers choose Ship only, Local pickup only, or Both.
- **Location**: When local pickup or both, sellers enter city and state/region (approximate only).
- **Browse**: Users can filter by "Local pickup" or "Ships", and by city/state.
- **Meetup**: Exact meetup details are coordinated via encrypted chat. We don't store exact addresses.

## 3. Cross-post link

- Sellers can add a URL to the same item on another platform ("Also listed elsewhere").
- Displayed on the listing detail page.

## 4. Nearby from the web

- Collapsible "Nearby from the web" section on the home feed.
- User selects an area (e.g. Austin, SF Bay, NYC); we fetch external classified listings via RSS.
- Read-only, clearly attributed. Links open the external site in a new tab.
