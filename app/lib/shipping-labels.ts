/**
 * Shipping Label Integration
 * 
 * Supports multiple providers:
 * - EasyPost (default) - https://www.easypost.com/
 * - Shippo (alternative) - https://apps.goshippo.com/join
 * 
 * NOTE: Shipping labels are OPTIONAL! Manual tracking works great too.
 * Set NEXT_PUBLIC_SHIPPING_PROVIDER to 'shippo' to use Shippo instead of EasyPost.
 * 
 * Current Status (Jan 2026):
 * - Shippo: Experiencing USPS maintenance issues
 * - EasyPost: More stable, recommended
 * - Manual tracking: Always works, no API needed (recommended for MVP)
 */

const SHIPPING_PROVIDER = process.env.NEXT_PUBLIC_SHIPPING_PROVIDER || 'easypost'
const EASYPOST_API_KEY = process.env.NEXT_PUBLIC_EASYPOST_API_KEY || ''
const SHIPPO_API_KEY = process.env.NEXT_PUBLIC_SHIPPO_API_KEY || ''
const EASYPOST_API_URL = 'https://api.easypost.com/v2'

interface ShippingAddress {
  name: string
  street1: string
  street2?: string
  city: string
  state: string
  zip: string
  country?: string
  phone?: string
  email?: string
}

interface ShippingLabelRequest {
  toAddress: ShippingAddress
  fromAddress: ShippingAddress
  parcel: {
    length: number // inches
    width: number
    height: number
    weight: number // ounces
  }
  service?: string // USPS Priority, First Class, etc.
}

interface ShippingLabelResponse {
  id: string
  tracking_code: string
  label_url: string
  tracking_url: string
  rate: {
    service: string
    rate: string
    currency: string
  }
  carrier: string
}

/**
 * Create a shipping label (supports EasyPost and Shippo)
 */
export async function createShippingLabel(
  request: ShippingLabelRequest
): Promise<ShippingLabelResponse> {
  // Use Shippo if configured, otherwise EasyPost
  if (SHIPPING_PROVIDER === 'shippo') {
    if (!SHIPPO_API_KEY) {
      throw new Error('Shippo API key not configured. Set NEXT_PUBLIC_SHIPPO_API_KEY')
    }
    const { createShippingLabelShippo } = await import('./shipping-shippo')
    return createShippingLabelShippo(request)
  }

  // Default to EasyPost
  if (!EASYPOST_API_KEY) {
    throw new Error('EasyPost API key not configured. Set NEXT_PUBLIC_EASYPOST_API_KEY (or use Shippo by setting NEXT_PUBLIC_SHIPPING_PROVIDER=shippo)')
  }

  try {
    // Create addresses
    const toAddressResponse = await fetch(`${EASYPOST_API_URL}/addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EASYPOST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: request.toAddress
      })
    })

    if (!toAddressResponse.ok) {
      const error = await toAddressResponse.json()
      throw new Error(`Failed to create to address: ${error.error?.message || 'Unknown error'}`)
    }

    const toAddress = await toAddressResponse.json()

    const fromAddressResponse = await fetch(`${EASYPOST_API_URL}/addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EASYPOST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: request.fromAddress
      })
    })

    if (!fromAddressResponse.ok) {
      const error = await fromAddressResponse.json()
      throw new Error(`Failed to create from address: ${error.error?.message || 'Unknown error'}`)
    }

    const fromAddress = await fromAddressResponse.json()

    // Create parcel
    const parcelResponse = await fetch(`${EASYPOST_API_URL}/parcels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EASYPOST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parcel: request.parcel
      })
    })

    if (!parcelResponse.ok) {
      const error = await parcelResponse.json()
      throw new Error(`Failed to create parcel: ${error.error?.message || 'Unknown error'}`)
    }

    const parcel = await parcelResponse.json()

    // Get rates
    const shipmentData = {
      shipment: {
        to_address: { id: toAddress.address.id },
        from_address: { id: fromAddress.address.id },
        parcel: { id: parcel.parcel.id }
      }
    }

    const ratesResponse = await fetch(`${EASYPOST_API_URL}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EASYPOST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shipmentData)
    })

    if (!ratesResponse.ok) {
      const error = await ratesResponse.json()
      throw new Error(`Failed to create shipment: ${error.error?.message || 'Unknown error'}`)
    }

    const shipment = await ratesResponse.json()

    // Select rate (use requested service or cheapest)
    let selectedRate = shipment.shipment.rates?.[0]
    if (request.service) {
      selectedRate = shipment.shipment.rates?.find(
        (r: any) => r.service.toLowerCase().includes(request.service!.toLowerCase())
      ) || selectedRate
    }

    if (!selectedRate) {
      throw new Error('No shipping rates available')
    }

    // Buy label
    const buyResponse = await fetch(`${EASYPOST_API_URL}/shipments/${shipment.shipment.id}/buy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EASYPOST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        rate: { id: selectedRate.id }
      })
    })

    if (!buyResponse.ok) {
      const error = await buyResponse.json()
      throw new Error(`Failed to buy label: ${error.error?.message || 'Unknown error'}`)
    }

    const purchasedShipment = await buyResponse.json()

    return {
      id: purchasedShipment.shipment.id,
      tracking_code: purchasedShipment.shipment.tracking_code,
      label_url: purchasedShipment.shipment.postage_label?.label_url || '',
      tracking_url: purchasedShipment.shipment.tracker?.public_url || '',
      rate: {
        service: selectedRate.service,
        rate: selectedRate.rate,
        currency: selectedRate.currency
      },
      carrier: selectedRate.carrier
    }
  } catch (error: any) {
    console.error('Error creating shipping label:', error)
    throw new Error(`Shipping label creation failed: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Get tracking information for a shipment
 */
export async function getTrackingInfo(trackingCode: string): Promise<any> {
  if (!EASYPOST_API_KEY) {
    throw new Error('EasyPost API key not configured')
  }

  try {
    const response = await fetch(`${EASYPOST_API_URL}/trackers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EASYPOST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tracker: {
          tracking_code: trackingCode
        }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get tracking: ${error.error?.message || 'Unknown error'}`)
    }

    return await response.json()
  } catch (error: any) {
    console.error('Error getting tracking info:', error)
    throw new Error(`Failed to get tracking: ${error.message || 'Unknown error'}`)
  }
}
