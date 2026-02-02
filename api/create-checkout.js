// api/create-checkout.js - Quick Pay Checkout (most reliable method)
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

    // Calculate total amount in cents
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Build item names list
    const itemNames = items.map(i => `${i.quantity}x ${i.name}`).join(', ');
    const description = itemNames.length > 255 ? itemNames.substring(0, 252) + '...' : itemNames;

    console.log('Creating Quick Pay checkout:');
    console.log('Items:', items.map(i => ({ name: i.name, qty: i.quantity, price: i.price })));
    console.log('Total:', totalAmount, 'CAD');
    console.log('Fulfillment:', fulfillmentType);

    // Build checkout options
    const checkoutOptions = {
      redirectUrl: req.headers.origin || 'https://asliceof-g.vercel.app',
      merchantSupportEmail: 'stephanie@asliceofg.com',
      askForShippingAddress: fulfillmentType === 'SHIPMENT',
      acceptedPaymentMethods: {
        applePay: true,
        googlePay: true,
        cashAppPay: false, // Not available in Canada
        afterpayClearpay: false
      }
    };

    // Add fulfillment note if provided
    const fullDescription = note 
      ? `${description} | Note: ${note}` 
      : description;

    // Create Quick Pay Payment Link
    const paymentLinkRequest = {
      idempotencyKey: randomUUID(),
      quickPay: {
        name: fullDescription.substring(0, 255) || 'A Slice of G Order',
        priceMoney: {
          amount: BigInt(totalAmount),
          currency: 'CAD'
        },
        locationId: locationId
      },
      checkoutOptions: checkoutOptions,
      description: fulfillmentType || 'PICKUP'
    };

    console.log('Payment link request:', JSON.stringify(paymentLinkRequest, null, 2));

    const result = await client.checkoutApi.createPaymentLink(paymentLinkRequest);

    console.log('Payment link created:', result.paymentLink.url);
    console.log('Order ID:', result.paymentLink.orderId);

    res.status(200).json({
      success: true,
      checkoutUrl: result.paymentLink.url,
      orderId: result.paymentLink.orderId,
      total: {
        amount: totalAmount,
        currency: 'CAD'
      }
    });

  } catch (error) {
    console.error('Checkout Error:', error);
    
    let errorMessage = 'Failed to create checkout';
    let details = error.message;
    
    if (error.errors && error.errors.length > 0) {
      errorMessage = error.errors[0].detail || errorMessage;
      details = JSON.stringify(error.errors, null, 2);
      console.error('Square API errors:', details);
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: details
    });
  }
};
