// api/process-payment.js
// This Vercel serverless function processes payments through Square

const { Client, Environment } = require('square');
const { randomUUID } = require('crypto');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { sourceId, amount, itemName, currency = 'USD' } = req.body;

    // Validate required fields
    if (!sourceId || !amount || !itemName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment information'
      });
    }

    // Initialize Square client
    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENVIRONMENT === 'sandbox' 
        ? Environment.Sandbox 
        : Environment.Production
    });

    // Create payment request
    const paymentRequest = {
      sourceId: sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(amount),
        currency: currency
      },
      locationId: process.env.SQUARE_LOCATION_ID,
      note: `A Slice of G - ${itemName}`,
      autocomplete: true
    };

    // Process the payment
    const { result } = await client.paymentsApi.createPayment(paymentRequest);

    // Return success response
    res.status(200).json({
      success: true,
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        amount: result.payment.amountMoney.amount.toString(),
        currency: result.payment.amountMoney.currency,
        receiptUrl: result.payment.receiptUrl
      }
    });

  } catch (error) {
    console.error('Payment Processing Error:', error);
    
    // Handle specific Square API errors
    let errorMessage = 'Payment processing failed. Please try again.';
    
    if (error.errors && error.errors.length > 0) {
      errorMessage = error.errors[0].detail || errorMessage;
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};
