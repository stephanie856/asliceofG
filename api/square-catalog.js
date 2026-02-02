// api/square-catalog.js
// This Vercel serverless function fetches your products from Square Catalog API
// and organizes them by category

const { Client, Environment } = require('square');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Determine environment - defaults to Production
    const envSetting = process.env.SQUARE_ENVIRONMENT || 'production';
    const isProduction = envSetting !== 'sandbox';
    
    console.log('=== SQUARE CATALOG DEBUG ===');
    console.log('Environment setting:', envSetting);
    console.log('Is Production:', isProduction);
    console.log('Location ID:', process.env.SQUARE_LOCATION_ID);
    console.log('Token exists:', !!process.env.SQUARE_ACCESS_TOKEN);
    console.log('Token length:', process.env.SQUARE_ACCESS_TOKEN?.length);

    // Initialize Square client
    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: isProduction ? Environment.Production : Environment.Sandbox
    });

    // Fetch catalog items
    let result;
    try {
      const response = await client.catalogApi.listCatalog(
        undefined, // cursor
        'ITEM,CATEGORY,IMAGE' // types to include
      );
      result = response.result;
      console.log('Square API call successful');
    } catch (apiError) {
      console.error('Square API Error:', apiError.message);
      return res.status(500).json({
        success: false,
        error: 'Square API Error: ' + apiError.message,
        debug: { envSetting, isProduction }
      });
    }

    console.log('Total objects from Square:', result.objects?.length || 0);

    // Create lookup maps
    const categories = {};
    const images = {};
    
    // First pass: organize categories and images
    if (result.objects) {
      result.objects.forEach(obj => {
        if (obj.type === 'CATEGORY') {
          categories[obj.id] = obj.categoryData?.name;
        } else if (obj.type === 'IMAGE') {
          images[obj.id] = obj.imageData?.url;
        }
      });
    }

    console.log('Categories found:', Object.keys(categories));
    console.log('Images found:', Object.keys(images).length);

    // Second pass: process items
    const products = [];
    const allItems = [];
    const rawItems = [];
    
    if (result.objects) {
      const items = result.objects.filter(obj => obj.type === 'ITEM');
      console.log('Items found:', items.length);
      
      items.forEach(item => {
        const itemData = item.itemData || {};
        
        // Store raw data for debugging
        rawItems.push({
          id: item.id,
          name: itemData.name,
          isDeleted: itemData.isDeleted,
          availableOnline: itemData.availableOnline,
          availableElectronically: itemData.availableElectronically,
          categoryId: itemData.categoryId,
          variationsCount: itemData.variations?.length || 0
        });
        
        // Check availability
        const isDeleted = itemData.isDeleted === true;
        const availableOnline = itemData.availableOnline !== false; // defaults to true if not set
        
        console.log(`Item: ${itemData.name} | isDeleted: ${isDeleted} | availableOnline: ${availableOnline}`);
        
        // Get the first variation
        const variation = itemData.variations?.[0];
        const variationData = variation?.itemVariationData || {};
        
        // Determine category
        let categoryName = 'Rum Infused Bites';
        if (itemData.categoryId && categories[itemData.categoryId]) {
          categoryName = categories[itemData.categoryId];
        }
        
        // Map to site categories
        const catLower = categoryName.toLowerCase();
        if (catLower.includes('accessor') || catLower.includes('card') || catLower.includes('tag')) {
          categoryName = 'Accessories';
        } else if (catLower.includes('cake') || catLower.includes('cookie') || 
                   catLower.includes('rum') || catLower.includes('bite')) {
          categoryName = 'Rum Infused Bites';
        }
        
        // Get image URL
        let imageUrl = null;
        if (itemData.imageIds?.length > 0) {
          imageUrl = images[itemData.imageIds[0]];
        }
        
        const product = {
          id: item.id,
          name: itemData.name,
          description: itemData.description || '',
          price: variationData.priceMoney?.amount || 0,
          currency: variationData.priceMoney?.currency || 'USD',
          category: categoryName,
          imageUrl: imageUrl,
          available: !isDeleted && availableOnline
        };
        
        allItems.push(product);
        
        if (product.available) {
          products.push(product);
          console.log(`  -> ADDED to available products`);
        } else {
          console.log(`  -> FILTERED OUT (deleted: ${isDeleted}, online: ${availableOnline})`);
        }
      });
    }

    console.log('=== SUMMARY ===');
    console.log('All items:', allItems.length);
    console.log('Available:', products.length);

    res.status(200).json({
      success: true,
      products: products,
      totalItems: products.length,
      debug: {
        environment: envSetting,
        isProduction: isProduction,
        locationId: process.env.SQUARE_LOCATION_ID,
        totalObjects: result.objects?.length || 0,
        rawItemsCount: rawItems.length,
        rawItems: rawItems,
        filteredOut: allItems.filter(p => !p.available).map(p => ({ 
          name: p.name, 
          reason: 'deleted or not available online'
        }))
      }
    });

  } catch (error) {
    console.error('Square Catalog API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch products from Square',
      stack: error.stack
    });
  }
};
