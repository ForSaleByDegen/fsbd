'use client'

export default function ShippingAddressGuidance() {
  return (
    <div className="space-y-4">
      <p className="text-[#00ff00] font-pixel-alt text-sm" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        We do not collect or store shipping addresses. Share your address with the seller via the encrypted chat on the listing page.
      </p>

      <div className="space-y-3">
        <div className="p-3 bg-black/50 border-2 border-[#660099] rounded">
          <h3 className="font-pixel text-[#ff00ff] text-sm mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
            General Delivery (free)
          </h3>
          <p className="text-[#660099] font-pixel-alt text-xs mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Pick up at a post office with ID. Format: Name, GENERAL DELIVERY, City, State ZIP
          </p>
          <a
            href="https://tools.usps.com/locations/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#ff00ff] font-pixel-alt text-xs underline hover:text-[#00ff00]"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Find post offices →
          </a>
        </div>

        <div className="p-3 bg-black/50 border-2 border-[#660099] rounded">
          <h3 className="font-pixel text-[#ff00ff] text-sm mb-2" style={{ fontFamily: 'var(--font-pixel)' }}>
            PO Box
          </h3>
          <p className="text-[#660099] font-pixel-alt text-xs mb-2" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
            Rent from USPS. Keeps your home address private.
          </p>
          <a
            href="https://poboxes.usps.com/findBox.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#ff00ff] font-pixel-alt text-xs underline hover:text-[#00ff00]"
            style={{ fontFamily: 'var(--font-pixel-alt)' }}
          >
            Find a PO Box →
          </a>
        </div>
      </div>

      <p className="text-[#660099] font-pixel-alt text-xs" style={{ fontFamily: 'var(--font-pixel-alt)' }}>
        Use the chat on the listing page to share your delivery address with the seller. Messages are encrypted.
      </p>
    </div>
  )
}
