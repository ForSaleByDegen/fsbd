# Project Structure

## Overview

This is a monorepo with three main workspaces:
- `app/` - Next.js frontend
- `backend/` - Express.js backend API
- `scripts/` - Deployment and utility scripts

## Frontend (`app/`)

```
app/
├── components/          # React components
│   ├── Header.js       # Navigation and wallet connection
│   ├── ListingCard.js  # Listing preview card
│   ├── ListingForm.js  # Create/edit listing form
│   └── SearchBar.js    # Search and filter UI
├── pages/              # Next.js pages/routes
│   ├── _app.js        # App wrapper with wallet provider
│   ├── index.js       # Home page (browse listings)
│   ├── listings/
│   │   ├── create.js  # Create new listing
│   │   ├── [id].js    # Listing detail page
│   │   └── my.js      # User's listings
│   └── tiers.js       # Tier information page
├── utils/
│   └── solana.js      # Solana blockchain utilities
├── styles/
│   └── globals.css    # Global Tailwind styles
└── package.json       # Frontend dependencies
```

## Backend (`backend/`)

```
backend/
├── models/            # Mongoose schemas
│   ├── Listing.js    # Listing model with encryption
│   └── User.js       # User model (minimal data)
├── routes/            # Express routes
│   ├── listings.js   # Listing CRUD endpoints
│   └── users.js      # User endpoints
├── server.js         # Express server setup
└── package.json      # Backend dependencies
```

## Scripts (`scripts/`)

```
scripts/
├── deployToken.ts    # Deploy $APPTOKEN script
├── tsconfig.json     # TypeScript config
└── package.json      # Script dependencies
```

## Key Features by File

### Solana Integration (`app/utils/solana.js`)
- Wallet connection utilities
- Token operations (create, transfer, balance checks)
- Tier calculation based on $APPTOKEN holdings
- Fee calculation with tier discounts
- Token launching for listings

### Listing Model (`backend/models/Listing.js`)
- Encrypted wallet address storage
- Text search indexing
- Category and status management
- Token launch information

### API Routes (`backend/routes/listings.js`)
- Public listing search and browse
- Authenticated listing creation
- Purchase processing
- Input validation and sanitization

## Data Flow

1. **User connects wallet** → Frontend uses `@solana/wallet-adapter-react`
2. **User creates listing** → Frontend calls Solana utils → Pays fee → Backend creates listing
3. **User browses listings** → Backend queries MongoDB → Returns public data
4. **User purchases** → Frontend creates transaction → Backend updates status

## Security Layers

1. **Frontend**: Input validation, XSS prevention
2. **Backend**: Rate limiting, input sanitization, encryption
3. **Database**: Hashed wallet addresses, encrypted sensitive data
4. **Blockchain**: On-chain verification, transparent transactions

## Environment Variables

See `.env.example` files in each workspace for required variables.

## Deployment

- Frontend: Vercel (see `app/vercel.json`)
- Backend: Render/Heroku (see `backend/Procfile`, `backend/render.yaml`)
