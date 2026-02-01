# Subcategories Setup

Listings can use subcategories to break down categories as the marketplace grows.

## 1. Run the migration

In Supabase SQL Editor, run `supabase/migration_subcategories.sql`:

```sql
-- Adds: subcategory column and indexes
```

## 2. How it works

- **Create listing**: When a category has subcategories (e.g. For Sale), an optional subcategory dropdown appears (Electronics, Furniture, etc.).
- **Browse**: When you select a category, a subcategory filter appears to narrow results.
- **Expand later**: Add new subcategories in `lib/categories.ts` — they appear automatically in the form and filters.

## 3. Adding subcategories

Edit `lib/categories.ts` and add entries to `SUBCATEGORIES`:

```ts
'for-sale': [
  { value: 'electronics', label: 'Electronics' },
  { value: 'furniture', label: 'Furniture' },
  // Add more...
],
```

No database changes needed when adding subcategories — just update the config file.
