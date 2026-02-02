# Privacy & Data Protection

$FSBD is designed to minimize exposure of user personal information. This document explains how we protect data from collection through storage and sharing.

## Image Metadata Stripping

**All images are stripped of embedded metadata before upload.**

### What We Remove

Images can contain sensitive metadata (EXIF, XMP, IPTC) including:

- **GPS coordinates** – exact location where the photo was taken
- **Camera/device info** – make, model, serial numbers
- **Timestamps** – when the photo was taken
- **Thumbnails** – embedded preview images
- **Other PII** – sometimes names, software versions, etc.

We strip **all** of this before any image is uploaded to IPFS (Pinata) or used for token creation (pump.fun).

### How It Works

1. **Client-side (browser)**: When a user selects images for a listing, we re-encode each image via an HTML5 canvas. Re-encoding produces a clean image with no embedded metadata. This runs entirely in the browser before any upload.

2. **Flow**:
   - User selects image(s) → metadata stripped → clean image(s) uploaded to Pinata
   - Token launch uses the same stripped images (no double upload of raw files)

3. **Supported formats**: JPEG, PNG, WebP, GIF.

4. **Quality**: Re-encoding preserves visual quality. JPEG uses 92% quality to avoid visible loss.

### Implementation

- `lib/strip-image-metadata.ts` – canvas-based stripping (client-only)
- `lib/pinata.ts` – calls `stripImageMetadata()` before every upload
- `CreateListingForm` – strips all images at submit before Pinata and token launch

### Filenames

Original filenames are preserved (e.g. `IMG_123.jpg`). Filenames are not sent as part of image metadata. If you prefer maximum anonymity, use generic names like `image.jpg` before uploading.

---

## Wallet Addresses

- **Hashing**: We store SHA-256 hashes of wallet addresses for lookups, RLS, and analytics. Hashes cannot be reversed to recover the address.
- **Plaintext**: The actual wallet address is stored where required for **payment routing** (Solana transfers need the recipient address). This is limited to listing seller addresses for purchases.
- **Access**: Only the seller’s wallet is stored per listing. Buyers are identified by hash only in sold/feedback records.

---

## Chat Messages

- **Encryption**: All chat messages use **tweetnacl secretbox** (XChaCha20-Poly1305).
- **Keys**: Derived from a shared secret between buyer and seller (wallet-based).
- **Storage**: Only encrypted ciphertext is stored. We never have access to plaintext.

---

## Shipping Addresses

- **We do not store shipping addresses.**
- Exchange happens via encrypted chat between buyer and seller.
- **Optional local storage**: Users can save an address on their device, encrypted with a key derived from their PIN or wallet signature. This data stays in the browser and is never sent to our servers.

---

## What We Do Not Store

- Shipping or delivery addresses
- Decrypted chat content
- Image metadata (EXIF, GPS, etc.) – stripped before upload
- Private keys (handled entirely by the user’s wallet)
- Payment card or bank details (crypto only)

---

## Data Minimization

- **Listing location** (city/region): Optional. Used for local pickup filters. Users can leave blank.
- **Profile area tag**: Optional. User-defined, not precise address.
- **Bug reports**: May include wallet hash and optional screenshots. Intended for support only.

---

## Summary

| Data type        | Stored?      | Protected how                      |
|------------------|-------------|-------------------------------------|
| Image metadata   | No          | Stripped before upload              |
| Wallet address   | Hash + plaintext where needed | Hash for lookups; plaintext only for payments |
| Chat             | Encrypted   | Secretbox, keys never on server     |
| Shipping address | No          | Exchanged via chat; optional local encrypted |
| Listing content  | Yes (public)| Titles/descriptions intended for browse/search |

For questions, see [Privacy Policy](/privacy) or [Terms of Service](/terms).
