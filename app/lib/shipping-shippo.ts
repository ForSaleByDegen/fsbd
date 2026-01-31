/**
 * Shippo Shipping Label Integration
 * 
 * Shippo is a developer-friendly alternative to EasyPost
 * - Easier signup process
 * - Pay-as-you-go: $0.05 per label (no monthly fee)
 * - Professional plan: $10/month + per-label fees
 * - Supports 1000+ carriers
 * - Excellent API documentation
 * 
 * Sign up: https://apps.goshippo.com/join
 * API Docs: https://docs.goshippo.com/
 */

const SHIPPO_API_KEY = process.env.NEXT_PUBLIC_SHIPPO_API_KEY || ''
const SHIPPO_API_URL = 'https://api.goshippo.com'

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
 * Create a shipping label via Shippo
 */
export async function createShippingLabelShippo(
  request: ShippingLabelRequest
): Promise<ShippingLabelResponse> {
  if (!SHIPPO_API_KEY) {
    throw new Error('Shippo API key not configured. Set NEXT_PUBLIC_SHIPPO_API_KEY')
  }

  try {
    // Create addresses
    const toAddress = {
      name: request.toAddress.name,
      street1: request.toAddress.street1,
      street2: request.toAddress.street2 || '',
      city: request.toAddress.city,
      state: request.toAddress.state,
      zip: request.toAddress.zip,
      country: request.toAddress.country || 'US',
      phone: request.toAddress.phone || '',
      email: request.toAddress.email || ''
    }

    const fromAddress = {
      name: request.fromAddress.name,
      street1: request.fromAddress.street1,
      street2: request.fromAddress.street2 || '',
      city: request.fromAddress.city,
      state: request.fromAddress.state,
      zip: request.fromAddress.zip,
      country: request.fromAddress.country || 'US',
      phone: request.fromAddress.phone || '',
      email: request.fromAddress.email || ''
    }

    // Create address objects in Shippo
    const toAddressResponse = await fetch(`${SHIPPO_API_URL}/addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(toAddress)
    })

    if (!toAddressResponse.ok) {
      const error = await toAddressResponse.json()
      throw new Error(`Failed to create to address: ${error.detail || error.message || 'Unknown error'}`)
    }

    const toAddressData = await toAddressResponse.json()

    const fromAddressResponse = await fetch(`${SHIPPO_API_URL}/addresses`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fromAddress)
    })

    if (!fromAddressResponse.ok) {
      const error = await fromAddressResponse.json()
      throw new Error(`Failed to create from address: ${error.detail || error.message || 'Unknown error'}`)
    }

    const fromAddressData = await fromAddressResponse.json()

    // Create parcel
    const parcel = {
      length: request.parcel.length.toString(),
      width: request.parcel.width.toString(),
      height: request.parcel.height.toString(),
      distance_unit: 'in',
      weight: request.parcel.weight.toString(),
      mass_unit: 'oz'
    }

    const parcelResponse = await fetch(`${SHIPPO_API_URL}/parcels`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(parcel)
    })

    if (!parcelResponse.ok) {
      const error = await parcelResponse.json()
      throw new Error(`Failed to create parcel: ${error.detail || error.message || 'Unknown error'}`)
    }

    const parcelData = await parcelResponse.json()

    // Get shipping rates
    const shipmentData = {
      address_from: fromAddressData.object_id,
      address_to: toAddressData.object_id,
      parcels: [parcelData.object_id],
      async: false
    }

    const ratesResponse = await fetch(`${SHIPPO_API_URL}/shipments`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(shipmentData)
    })

    if (!ratesResponse.ok) {
      const error = await ratesResponse.json()
      throw new Error(`Failed to create shipment: ${error.detail || error.message || 'Unknown error'}`)
    }

    const shipment = await ratesResponse.json()

    // Select rate (use requested service or cheapest)
    let selectedRate = shipment.rates?.[0]
    if (request.service) {
      selectedRate = shipment.rates?.find(
        (r: any) => r.servicelevel?.name?.toLowerCase().includes(request.service!.toLowerCase())
      ) || selectedRate
    }

    if (!selectedRate) {
      throw new Error('No shipping rates available')
    }

    // Purchase label
    const transactionData = {
      rate: selectedRate.object_id,
      async: false
    }

    const transactionResponse = await fetch(`${SHIPPO_API_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    })

    if (!transactionResponse.ok) {
      const error = await transactionResponse.json()
      throw new Error(`Failed to purchase label: ${error.detail || error.message || 'Unknown error'}`)
    }

    const transaction = await transactionResponse.json()

    return {
      id: transaction.object_id,
      tracking_code: transaction.tracking_number || '',
      label_url: transaction.label_url || '',
      tracking_url: transaction.tracking_url_provider || '',
      rate: {
        service: selectedRate.servicelevel?.name || selectedRate.servicelevel?.token || 'Unknown',
        rate: selectedRate.amount,
        currency: selectedRate.currency || 'USD'
      },
      carrier: selectedRate.provider || 'Unknown'
    }
  } catch (error: any) {
    console.error('Error creating Shippo label:', error)
    throw new Error(`Shipping label creation failed: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Get tracking information for a shipment
 */
export async function getTrackingInfoShippo(trackingNumber: string, carrier: string): Promise<any> {
  if (!SHIPPO_API_KEY) {
    throw new Error('Shippo API key not configured')
  }

  try {
    const response = await fetch(`${SHIPPO_API_URL}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${SHIPPO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tracking_number: trackingNumber,
        carrier: carrier.toLowerCase()
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to get tracking: ${error.detail || error.message || 'Unknown error'}`)
    }

    return await response.json()
  } catch (error: any) {
    console.error('Error getting Shippo tracking:', error)
    throw new Error(`Failed to get tracking: ${error.message || 'Unknown error'}`)
  }
}
