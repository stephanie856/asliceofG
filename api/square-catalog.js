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
    console.log('Environment:', process.env.SQUARE_ENVIRONMENT || 'not set');
    console.log('Token exists:', !!process.env.SQUARE_ACCESS_TOKEN);

    // Initialize Square client - defaults to Production
    const isProduction = !process.env.SQUARE_ENVIRONMENT || process.env.SQUARE_ENVIRONMENT === 'production';
    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: isProduction ? Environment.Production : Environment.Sandbox
    });

    // Fetch catalog items
    const { result } = await client.catalogApi.listCatalog(
      undefined, // cursor
      'ITEM,CATEGORY,IMAGE' // types to include
    );

    console.log('Total objects from Square:', result.objects?.length || 0);

    // Create lookup maps
    const categories = {};
    const images = {};
    
    // First pass: organize categories and images
    if (result.objects) {
      result.objects.forEach(obj => {
        if (obj.type === 'CATEGORY') {
          categories[obj.id] = obj.categoryData.name;
        } else if (obj.type === 'IMAGE') {
          images[obj.id] = obj.imageData.url;
        }
      });
    }

    console.log('Categories found:', Object.keys(categories).length);
    console.log('Images found:', Object.keys(images).length);

    // Second pass: process items and assign categories
    const products = [];
    const allItems = [];
    
    if (result.objects) {
      result.objects
        .filter(obj => obj.type === 'ITEM')
        .forEach(item => {
          const itemData = item.itemData;
          
          // Debug logging
          console.log('Processing item:', {
            name: itemData?.name,
            isDeleted: itemData?.isDeleted,
            availableOnline: itemData?.availableOnline,
            availableElectronically: itemData?.availableElectronically,
            variations: itemData?.variations?.length || 0
          });
          
          // Get the first variation (most items have one variation)
          const variation = itemData?.variations?.[0];
          const variationData = variation?.itemVariationData;
          
          // Determine category name
          let categoryName = 'Rum Infused Bites'; // Default category
          
          if (itemData?.categoryId && categories[itemData.categoryId]) {
            categoryName = categories[itemData.categoryId];
          }
          
          // Map Square categories to your site sections
          if (categoryName.toLowerCase().includes('accessor') || 
              categoryName.toLowerCase().includes('card') || 
              categoryName.toLowerCase().includes('tag')) {
            categoryName = 'Accessories';
          } else if (categoryName.toLowerCase().includes('cake') || 
                     categoryName.toLowerCase().includes('cookie') ||
                     categoryName.toLowerCase().includes('rum') ||
                     categoryName.toLowerCase().includes('bite')) {
            categoryName = 'Rum Infused Bites';
          }
          
          // Get image URL
          let imageUrl = null;
          if (itemData?.imageIds && itemData.imageIds.length > 0) {
            imageUrl = images[itemData.imageIds[0]];
          }
          
          const product = {
            id: item.id,
            name: itemData?.name,
            description: itemData?.description || '',
            price: variationData?.priceMoney?.amount || 0,
            currency: variationData?.priceMoney?.currency || 'USD',
            category: categoryName,
            imageUrl: imageUrl,
            available: !itemData?.isDeleted && itemData?.availableOnline !== false
          };
          
          allItems.push(product);
          
          // Only add available products
          if (product.available) {
            products.push(product);
          }
        });
    }

    console.log('All items found:', allItems.length);
    console.log('Available items:', products.length);

    res.status(200).json({
      success: true,
      products: products,
      totalItems: products.length,
      debug: {
        environment: process.env.SQUARE_ENVIRONMENT || 'not set',
        totalObjects: result.objects?.length || 0,
        allItemsCount: allItems.length,
        filteredOutCount: allItems.length - products.length,
        filteredOutReasons: allItems.filter(p => !p.available).map(p => ({ 
          name: p.name, 
          available: p.available 
        }))
      }
    });

  } catch (error) {
    console.error('Square Catalog API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch products from Square'
    });
  }
};
