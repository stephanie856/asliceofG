// api/create-checkout.js - Create Order then Payment Link (proper Square flow)
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

    console.log('Creating order for items:', items.map(i => ({ name: i.name, qty: i.quantity })));

    // Step 1: Create an Order with line items
    const lineItems = items.map(item => {
      // Build order line item
      const lineItem = {
        quantity: String(item.quantity),
        name: item.name,
        basePriceMoney: {
          amount: BigInt(item.price),
          currency: 'CAD'
        }
      };
      
      // If we have a Square catalog item ID, use it
      if (item.id && item.id.startsWith('#') === false) {
        try {
          lineItem.catalogObjectId = item.id;
        } catch (e) {
          // If catalog ID fails, use custom line item
        }
      }
      
      return lineItem;
    });

    // Build order request
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

    // Add fulfillment if specified
    if (fulfillmentType) {
      orderRequest.order.fulfillments = [{
        type: fulfillmentType,
        state: 'PROPOSED',
        pickupDetails: fulfillmentType === 'PICKUP' ? {
          recipient: email ? { emailAddress: email } : undefined,
          note: note || undefined
        } : undefined,
        shipmentDetails: fulfillmentType === 'SHIPMENT' ? {
          recipient: email ? { emailAddress: email } : undefined,
          note: note || undefined
        } : undefined
      }];
    }

    console.log('Order request:', JSON.stringify(orderRequest, null, 2));

    // Create the order
    const { result: orderResult } = await client.ordersApi.createOrder(orderRequest);
    const orderId = orderResult.order.id;
    const totalAmount = orderResult.order.totalMoney.amount;

    console.log('Order created:', orderId, 'Total:', totalAmount);

    // Step 2: Create Payment Link for this order
    const paymentLinkResult = await client.checkoutApi.createPaymentLink({
      idempotencyKey: randomUUID(),
      order: {
        orderId: orderId,
        locationId: locationId
      },
      checkoutOptions: {
        redirectUrl: req.headers.origin || 'https://asliceof-g.vercel.app',
        merchantSupportEmail: 'stephanie@asliceofg.com',
        askForShippingAddress: fulfillmentType === 'SHIPMENT'
      },
      description: `A Slice of G - ${items.length} item(s)`
    });

    console.log('Payment link created:', paymentLinkResult.paymentLink.url);

    res.status(200).json({
      success: true,
      checkoutUrl: paymentLinkResult.paymentLink.url,
      orderId: orderId,
      total: {
        amount: Number(totalAmount),
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
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: details
    });
  }
};
