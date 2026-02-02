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
    // Initialize Square client
    const client = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENVIRONMENT === 'sandbox' 
        ? Environment.Sandbox 
        : Environment.Production
    });

    // Fetch catalog items
    const { result } = await client.catalogApi.listCatalog(
      undefined, // cursor
      'ITEM,CATEGORY,IMAGE' // types to include
    );

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

    // Second pass: process items and assign categories
    const products = [];
    
    if (result.objects) {
      result.objects
        .filter(obj => obj.type === 'ITEM')
        .forEach(item => {
          const itemData = item.itemData;
          
          // Get the first variation (most items have one variation)
          const variation = itemData.variations?.[0];
          const variationData = variation?.itemVariationData;
          
          // Determine category name
          let categoryName = 'Rum Infused Bites'; // Default category
          
          if (itemData.categoryId && categories[itemData.categoryId]) {
            categoryName = categories[itemData.categoryId];
          }
          
          // Map Square categories to your site sections
          // You can customize this mapping based on your Square category names
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
          if (itemData.imageIds && itemData.imageIds.length > 0) {
            imageUrl = images[itemData.imageIds[0]];
          }
          
          products.push({
            id: item.id,
            name: itemData.name,
            description: itemData.description || '',
            price: variationData?.priceMoney?.amount || 0,
            currency: variationData?.priceMoney?.currency || 'USD',
            category: categoryName,
            imageUrl: imageUrl,
            available: !itemData.isDeleted && itemData.availableOnline !== false
          });
        });
    }

    // Filter out unavailable products
    const availableProducts = products.filter(p => p.available);

    res.status(200).json({
      success: true,
      products: availableProducts,
      totalItems: availableProducts.length
    });

  } catch (error) {
    console.error('Square Catalog API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch products from Square'
    });
  }
};
