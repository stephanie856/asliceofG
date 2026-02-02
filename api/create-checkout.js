// api/create-checkout.js - Square Order Checkout (uses catalog items)
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

    console.log('Creating Order checkout for items:', items.map(i => ({ 
      name: i.name, 
      qty: i.quantity, 
      id: i.id,
      variationId: i.variationId 
    })));

    // Build line items from catalog
    const lineItems = items.map(item => {
      // Use variationId if available (preferred), otherwise use item id
      const catalogObjectId = item.variationId || item.id;
      
      return {
        quantity: String(item.quantity),
        catalogObjectId: catalogObjectId
      };
    });

    console.log('Line items:', JSON.stringify(lineItems, null, 2));

    // Step 1: Create the Order
    const orderRequest = {
      idempotencyKey: randomUUID(),
      order: {
        locationId: locationId,
        lineItems: lineItems,
        source: {
          name: 'A Slice of G Website'
        }
      }
    };

    // Add fulfillment preferences if specified
    if (fulfillmentType) {
      orderRequest.order.fulfillments = [{
        type: fulfillmentType,
        state: 'PROPOSED'
      }];
    }

    console.log('Order request:', JSON.stringify(orderRequest, null, 2));

    const { result: orderResult } = await client.ordersApi.createOrder(orderRequest);
    const orderId = orderResult.order.id;
    const totalMoney = orderResult.order.totalMoney;

    console.log('Order created:', orderId);
    console.log('Order total:', totalMoney);

    // Step 2: Create Payment Link with the order
    const paymentLinkRequest = {
      idempotencyKey: randomUUID(),
      order: {
        orderId: orderId,
        locationId: locationId
      },
      checkoutOptions: {
        redirectUrl: req.headers.origin || 'https://asliceof-g.vercel.app',
        merchantSupportEmail: 'stephanie@asliceofg.com',
        askForShippingAddress: fulfillmentType === 'SHIPMENT'
      }
    };

    // Add pre-filled email if provided
    if (email) {
      paymentLinkRequest.checkoutOptions.prePopulateBuyerEmail = email;
    }

    console.log('Payment link request:', JSON.stringify(paymentLinkRequest, null, 2));

    const result = await client.checkoutApi.createPaymentLink(paymentLinkRequest);

    console.log('Payment link created:', result.paymentLink.url);

    res.status(200).json({
      success: true,
      checkoutUrl: result.paymentLink.url,
      orderId: orderId,
      total: {
        amount: Number(totalMoney.amount),
        currency: totalMoney.currency
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
