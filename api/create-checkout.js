// api/create-checkout.js - Simplified checkout using Square Payment Links
const { Client, Environment } = require('square');
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

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

    // Build line items using item variation IDs
    const lineItems = items.map(item => {
      // Use variation ID if available, otherwise use item ID
      const catalogObjectId = item.variationId || item.id;
      return {
        quantity: String(item.quantity),
        catalogObjectId: catalogObjectId
      };
    });

    console.log('Creating checkout with items:', JSON.stringify(lineItems, null, 2));

    // Create Payment Link (simpler than full order + checkout)
    const paymentLinkRequest = {
      idempotencyKey: randomUUID(),
      quickPay: {
        name: items.map(i => i.name).join(', ').substring(0, 255),
        priceMoney: {
          amount: BigInt(items.reduce((sum, item) => sum + (item.price * item.quantity), 0)),
          currency: 'USD'
        },
        locationId: locationId
      },
      checkoutOptions: {
        redirectUrl: `${req.headers.origin || 'https://asliceof-g.vercel.app'}`,
        merchantSupportEmail: 'stephanie@asliceofg.com',
        askForShippingAddress: fulfillmentType === 'SHIPMENT',
        acceptedPaymentMethods: {
          applePay: true,
          googlePay: true,
          cashAppPay: true,
          afterpayClearpay: false
        }
      },
      description: note || `Order from A Slice of G - ${fulfillmentType}`
    };

    // If we have valid catalog items, use them; otherwise use quickPay
    let result;
    try {
      // Try to create with catalog items first
      const orderLineItems = items.map(item => ({
        quantity: String(item.quantity),
        catalogObjectId: item.id
      }));
      
      result = await client.checkoutApi.createPaymentLink({
        idempotencyKey: randomUUID(),
        order: {
          locationId: locationId,
          lineItems: orderLineItems
        },
        checkoutOptions: {
          redirectUrl: `${req.headers.origin || 'https://asliceof-g.vercel.app'}`,
          merchantSupportEmail: 'stephanie@asliceofg.com',
          askForShippingAddress: fulfillmentType === 'SHIPMENT'
        }
      });
    } catch (orderError) {
      // Fall back to quickPay if catalog items fail
      console.log('Catalog order failed, using quickPay:', orderError.message);
      result = await client.checkoutApi.createPaymentLink(paymentLinkRequest);
    }

    console.log('Payment link created:', result.paymentLink.url);

    res.status(200).json({
      success: true,
      checkoutUrl: result.paymentLink.url,
      orderId: result.paymentLink.orderId,
      total: {
        amount: items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        currency: 'USD'
      }
    });

  } catch (error) {
    console.error('Checkout Error:', error);
    
    let errorMessage = 'Failed to create checkout';
    let details = error.message;
    
    if (error.errors && error.errors.length > 0) {
      errorMessage = error.errors[0].detail || errorMessage;
      details = JSON.stringify(error.errors);
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: details
    });
  }
};
