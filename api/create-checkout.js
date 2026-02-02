// api/create-checkout.js - Creates Square checkout link and redirects
const { Client, Environment } = require('square');
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items' });
    }

    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!accessToken || !locationId) {
      return res.status(500).json({ success: false, error: 'Square not configured' });
    }

    const client = new Client({
      accessToken: accessToken,
      environment: Environment.Production
    });

    // Create line items from catalog
    const lineItems = items.map(item => ({
      quantity: String(item.quantity),
      catalogObjectId: item.variationId || item.id
    }));

    // Create order
    const orderRequest = {
      idempotencyKey: randomUUID(),
      order: {
        locationId: locationId,
        lineItems: lineItems
      }
    };

    const { result: orderResult } = await client.ordersApi.createOrder(orderRequest);

    // Create checkout link
    const paymentLinkResult = await client.checkoutApi.createPaymentLink({
      idempotencyKey: randomUUID(),
      order: {
        orderId: orderResult.order.id,
        locationId: locationId
      },
      checkoutOptions: {
        redirectUrl: 'https://asliceof-g.vercel.app',
        merchantSupportEmail: 'stephanie@asliceofg.com'
      }
    });

    res.status(200).json({
      success: true,
      checkoutUrl: paymentLinkResult.paymentLink.url,
      orderId: orderResult.order.id
    });

  } catch (error) {
    console.error('Checkout Error:', error);
    res.status(500).json({
      success: false,
      error: error.errors?.[0]?.detail || 'Failed to create checkout'
    });
  }
};
