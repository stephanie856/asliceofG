// api/create-checkout.js - Square Order Checkout per Square documentation
// https://developer.squareup.com/docs/checkout-api/square-order-checkout

const { Client, Environment } = require('square');
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  // CORS headers
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

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'No items in cart' });
    }

    // Get environment variables
    const envSetting = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
    const isProduction = envSetting !== 'sandbox';
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    const locationId = process.env.SQUARE_LOCATION_ID;

    if (!accessToken || !locationId) {
      return res.status(500).json({ 
        success: false, 
        error: 'Square not configured. Check SQUARE_ACCESS_TOKEN and SQUARE_LOCATION_ID' 
      });
    }

    // Initialize Square client
    const client = new Client({
      accessToken: accessToken,
      environment: isProduction ? Environment.Production : Environment.Sandbox
    });

    console.log('Creating Square Order Checkout...');
    console.log('Items:', items.map(i => ({ 
      name: i.name, 
      qty: i.quantity, 
      variationId: i.variationId,
      itemId: i.id
    })));
    console.log('Fulfillment type:', fulfillmentType);

    // Step 1: Build line items for the order
    // https://developer.squareup.com/docs/orders-api/create-orders
    const lineItems = items.map(item => {
      // Square requires catalogObjectId to be the CatalogItemVariation ID
      const catalogObjectId = item.variationId || item.id;
      
      if (!catalogObjectId) {
        throw new Error(`Item ${item.name} is missing required variation ID`);
      }

      // Build line item with modifiers
      const lineItem = {
        quantity: String(item.quantity),
        catalogObjectId: catalogObjectId
      };

      // Add modifiers if selected
      if (item.modifiers && item.modifiers.length > 0) {
        lineItem.modifiers = item.modifiers.map(mod => ({
          catalogObjectId: mod.id
        }));
      }

      // Add note with variation name and modifiers for clarity
      const parts = [];
      if (item.variationName && item.variationName !== 'Default') {
        parts.push(item.variationName);
      }
      if (item.modifiers && item.modifiers.length > 0) {
        parts.push(item.modifiers.map(m => m.name).join(', '));
      }
      if (parts.length > 0) {
        lineItem.note = parts.join(' - ');
      }

      return lineItem;
    });

    console.log('Line items for order:', JSON.stringify(lineItems, null, 2));

    // Step 2: Create the Order
    // https://developer.squareup.com/docs/checkout-api/square-order-checkout
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

    // Add note if provided
    if (note) {
      orderRequest.order.note = note;
    }

    // Add fulfillments if fulfillment type is specified
    // This enables pickup or shipping options in checkout
    if (fulfillmentType) {
      orderRequest.order.fulfillments = [
        {
          type: fulfillmentType, // 'PICKUP' or 'SHIPMENT'
          state: 'PROPOSED'
        }
      ];
    }

    console.log('Creating order with request:', JSON.stringify(orderRequest, null, 2));

    // Create the order using Orders API
    const { result: orderResult } = await client.ordersApi.createOrder(orderRequest);
    
    const orderId = orderResult.order.id;
    const orderTotal = orderResult.order.totalMoney;

    console.log('Order created successfully:');
    console.log('  Order ID:', orderId);
    console.log('  Total:', orderTotal.amount, orderTotal.currency);
    console.log('  Line items:', orderResult.order.lineItems?.length || 0);

    // Step 3: Create Payment Link with the order
    // https://developer.squareup.com/docs/checkout-api/manage-checkout
    const paymentLinkRequest = {
      idempotencyKey: randomUUID(),
      order: {
        orderId: orderId,
        locationId: locationId
      },
      checkoutOptions: {
        redirectUrl: req.headers.origin || 'https://asliceof-g.vercel.app',
        merchantSupportEmail: 'stephanie@asliceofg.com'
      }
    };

    // Ask for shipping address if fulfillment type is SHIPMENT
    // https://developer.squareup.com/docs/checkout-api/optional-checkout-configurations
    if (fulfillmentType === 'SHIPMENT') {
      paymentLinkRequest.checkoutOptions.askForShippingAddress = true;
    }

    // Pre-populate buyer email if provided
    if (email) {
      paymentLinkRequest.prePopulatedData = {
        buyerEmail: email
      };
    }

    console.log('Creating payment link with request:', JSON.stringify(paymentLinkRequest, null, 2));

    // Create the payment link
    const { result: paymentLinkResult } = await client.checkoutApi.createPaymentLink(paymentLinkRequest);

    console.log('Payment link created successfully:');
    console.log('  URL:', paymentLinkResult.paymentLink.url);
    console.log('  Payment Link ID:', paymentLinkResult.paymentLink.id);

    // Return success response
    res.status(200).json({
      success: true,
      checkoutUrl: paymentLinkResult.paymentLink.url,
      orderId: orderId,
      paymentLinkId: paymentLinkResult.paymentLink.id,
      total: {
        amount: Number(orderTotal.amount),
        currency: orderTotal.currency
      }
    });

  } catch (error) {
    console.error('Checkout Error:', error);
    
    // Extract detailed error information
    let errorMessage = 'Failed to create checkout';
    let errorDetails = error.message;
    let errorCode = null;
    
    if (error.errors && error.errors.length > 0) {
      const firstError = error.errors[0];
      errorMessage = firstError.detail || firstError.message || errorMessage;
      errorCode = firstError.code;
      errorDetails = JSON.stringify(error.errors, null, 2);
      
      console.error('Square API Error Details:');
      console.error('  Code:', firstError.code);
      console.error('  Category:', firstError.category);
      console.error('  Detail:', firstError.detail);
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      code: errorCode,
      details: errorDetails
    });
  }
};
