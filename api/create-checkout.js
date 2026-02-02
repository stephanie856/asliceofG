// api/create-checkout.js
// Creates a Square checkout with fulfillment options (shipping, pickup)

const { Client, Environment } = require('square');
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { items, fulfillmentType, email, note } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in cart' });
    }

    const envSetting = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
    const isProduction = envSetting !== 'sandbox';
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!accessToken || !locationId) {
      return res.status(500).json({ success: false, error: 'Square not configured' });
    }

    const client = new Client({
      accessToken: accessToken,
      environment: isProduction ? Environment.Production : Environment.Sandbox
    });

    // Build line items for the order
    const lineItems = items.map(item => ({
      quantity: String(item.quantity),
      catalogObjectId: item.id, // Square catalog item ID
      itemType: 'ITEM'
    }));

    // Build fulfillment based on type
    let fulfillment = null;
    if (fulfillmentType === 'PICKUP') {
      fulfillment = {
        pickupDetails: {
          recipient: {
            emailAddress: email || ''
          },
          note: note || '',
          scheduleType: 'ASAP' // or 'SCHEDULED' with pickupAt timestamp
        },
        state: 'PROPOSED',
        type: 'PICKUP'
      };
    } else if (fulfillmentType === 'SHIPMENT') {
      fulfillment = {
        shipmentDetails: {
          recipient: {
            emailAddress: email || ''
          },
          note: note || ''
        },
        state: 'PROPOSED',
        type: 'SHIPMENT'
      };
    }

    // Create the order
    const orderRequest = {
      idempotencyKey: randomUUID(),
      order: {
        locationId: locationId,
        lineItems: lineItems,
        ...(fulfillment && { fulfillments: [fulfillment] })
      }
    };

    console.log('Creating order:', JSON.stringify(orderRequest, null, 2));

    const { result: orderResult } = await client.ordersApi.createOrder(orderRequest);
    const orderId = orderResult.order.id;
    const totalMoney = orderResult.order.totalMoney;

    console.log('Order created:', orderId, 'Total:', totalMoney);

    // Create Square checkout link
    const checkoutRequest = {
      idempotencyKey: randomUUID(),
      order: {
        locationId: locationId,
        lineItems: lineItems
      },
      merchantSupportEmail: 'stephanie@asliceofg.com',
      askForShippingAddress: fulfillmentType === 'SHIPMENT',
      prePopulateBuyerEmail: email || undefined,
      note: note || undefined
    };

    // For production, use Square Checkout API or Payment Links
    // Since Checkout API creates a Square-hosted page, let's use Payment Links API
    const { result: linkResult } = await client.checkoutApi.createPaymentLink({
      idempotencyKey: randomUUID(),
      order: {
        locationId: locationId,
        lineItems: lineItems
      },
      checkoutOptions: {
        merchantSupportEmail: 'stephanie@asliceofg.com',
        askForShippingAddress: fulfillmentType === 'SHIPMENT',
        allowTipping: true,
        redirectUrl: `${req.headers.origin || 'https://asliceof-g.vercel.app'}/order-complete`
      },
      description: 'A Slice of G Order'
    });

    console.log('Payment link created:', linkResult.paymentLink);

    res.status(200).json({
      success: true,
      checkoutUrl: linkResult.paymentLink.url,
      orderId: orderId,
      total: {
        amount: Number(totalMoney.amount),
        currency: totalMoney.currency
      }
    });

  } catch (error) {
    console.error('Checkout Error:', error);
    
    let errorMessage = 'Failed to create checkout';
    if (error.errors && error.errors.length > 0) {
      errorMessage = error.errors[0].detail || errorMessage;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message
    });
  }
};
