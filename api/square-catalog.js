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
    console.log('Location ID:', process.env.SQUARE_LOCATION_ID);
    
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

    // Fetch catalog items for the specific location
    const locationId = process.env.SQUARE_LOCATION_ID;
    console.log('Fetching catalog for location:', locationId);
    
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
        
        // Category mapping - only include items from specific categories
        const allowedCategories = ['Rum Infused Bites', 'Accessories', 'Dinner Parties', 'Catering'];
        
        let originalCategory = '';
        if (itemData.categoryId && categories[itemData.categoryId]) {
          originalCategory = categories[itemData.categoryId];
        }
        
        const catLower = originalCategory.toLowerCase();
        let categoryName = null;
        
        // Map Square categories to site categories
        if (catLower.includes('accessor') || catLower.includes('card') || catLower.includes('tag') || catLower.includes('gift')) {
          categoryName = 'Accessories';
        } else if (catLower.includes('cake') || catLower.includes('cookie') || catLower.includes('rum') || catLower.includes('bite')) {
          categoryName = 'Rum Infused Bites';
        } else if (catLower.includes('dinner') || catLower.includes('party')) {
          categoryName = 'Dinner Parties';
        } else if (catLower.includes('cater')) {
          categoryName = 'Catering';
        }
        
        // Log items that don't match for debugging
        if (!categoryName) {
          console.log('Item without matching category:', itemData.name, '- Original category:', originalCategory);
          // Default to Rum Infused Bites if no category match
          categoryName = 'Rum Infused Bites';
        }
        
        // Skip items that don't match any allowed category
        if (!allowedCategories.includes(categoryName)) {
          console.log('Skipping item - category not allowed:', itemData.name, categoryName);
          return;
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
        locationId: locationId,
        totalObjects: result.objects ? result.objects.length : 0,
        allItemsCount: allItems.length,
        filteredOutCount: allItems.length - products.length,
        rawItems: allItems.map(p => ({ name: p.name, category: p.category, available: p.available }))
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
