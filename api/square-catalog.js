// api/square-catalog.js
const { Client, Environment } = require('square');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get environment variables
    const envSetting = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
    const isProduction = envSetting !== 'sandbox';
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;
    
    console.log('Environment:', envSetting);
    console.log('Is Production:', isProduction);
    console.log('Token exists:', !!accessToken);
    
    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: 'SQUARE_ACCESS_TOKEN not configured'
      });
    }

    // Initialize Square client
    const client = new Client({
      accessToken: accessToken,
      environment: isProduction ? Environment.Production : Environment.Sandbox
    });

    // Fetch catalog items
    const response = await client.catalogApi.listCatalog(undefined, 'ITEM,CATEGORY,IMAGE');
    const result = response.result;
    
    console.log('Total objects:', result.objects ? result.objects.length : 0);

    // Create lookup maps
    const categories = {};
    const images = {};
    
    if (result.objects) {
      result.objects.forEach(obj => {
        if (obj.type === 'CATEGORY') {
          categories[obj.id] = obj.categoryData ? obj.categoryData.name : 'Uncategorized';
        } else if (obj.type === 'IMAGE') {
          images[obj.id] = obj.imageData ? obj.imageData.url : null;
        }
      });
    }

    // Process items
    const products = [];
    const allItems = [];
    
    if (result.objects) {
      const items = result.objects.filter(obj => obj.type === 'ITEM');
      
      items.forEach(item => {
        const itemData = item.itemData || {};
        
        // Check availability
        const isDeleted = itemData.isDeleted === true;
        const availableOnline = itemData.availableOnline !== false;
        
        // Get variation
        const variation = itemData.variations && itemData.variations[0];
        const variationData = variation ? variation.itemVariationData : {};
        
        // Category
        let categoryName = 'Rum Infused Bites';
        if (itemData.categoryId && categories[itemData.categoryId]) {
          categoryName = categories[itemData.categoryId];
        }
        
        const catLower = categoryName.toLowerCase();
        if (catLower.includes('accessor') || catLower.includes('card') || catLower.includes('tag')) {
          categoryName = 'Accessories';
        } else if (catLower.includes('cake') || catLower.includes('cookie') || catLower.includes('rum') || catLower.includes('bite')) {
          categoryName = 'Rum Infused Bites';
        }
        
        // Image
        let imageUrl = null;
        if (itemData.imageIds && itemData.imageIds.length > 0) {
          imageUrl = images[itemData.imageIds[0]];
        }
        
        // Convert BigInt to Number for JSON serialization
        let price = 0;
        if (variationData.priceMoney && variationData.priceMoney.amount) {
          price = Number(variationData.priceMoney.amount);
        }
        
        const product = {
          id: item.id,
          name: itemData.name || 'Unnamed Product',
          description: itemData.description || '',
          price: price,
          currency: variationData.priceMoney ? variationData.priceMoney.currency : 'USD',
          category: categoryName,
          imageUrl: imageUrl,
          available: !isDeleted && availableOnline
        };
        
        allItems.push(product);
        
        if (product.available) {
          products.push(product);
        }
      });
    }

    res.status(200).json({
      success: true,
      products: products,
      totalItems: products.length,
      debug: {
        environment: envSetting,
        isProduction: isProduction,
        totalObjects: result.objects ? result.objects.length : 0,
        allItemsCount: allItems.length,
        filteredOutCount: allItems.length - products.length,
        rawItems: allItems.map(p => ({ name: p.name, available: p.available }))
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Unknown error',
      type: error.constructor.name
    });
  }
};
