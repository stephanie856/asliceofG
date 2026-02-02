// api/square-catalog.js - Full catalog with variations and modifiers
const { Client, Environment } = require('square');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const envSetting = (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase();
    const isProduction = envSetting !== 'sandbox';
    const accessToken = process.env.SQUARE_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({ success: false, error: 'SQUARE_ACCESS_TOKEN not configured' });
    }

    const client = new Client({
      accessToken: accessToken,
      environment: isProduction ? Environment.Production : Environment.Sandbox
    });

    // Fetch full catalog
    const { result } = await client.catalogApi.listCatalog(undefined, 'ITEM,CATEGORY,IMAGE,MODIFIER_LIST');

    // Build lookup maps
    const categories = {};
    const images = {};
    const modifierLists = {};

    if (result.objects) {
      result.objects.forEach(obj => {
        if (obj.type === 'CATEGORY') {
          categories[obj.id] = obj.categoryData?.name || 'Uncategorized';
        } else if (obj.type === 'IMAGE') {
          images[obj.id] = obj.imageData?.url;
        } else if (obj.type === 'MODIFIER_LIST') {
          modifierLists[obj.id] = {
            id: obj.id,
            name: obj.modifierListData?.name || 'Options',
            modifiers: (obj.modifierListData?.modifiers || []).map(m => ({
              id: m.id,
              name: m.modifierData?.name,
              price: m.modifierData?.priceMoney?.amount ? Number(m.modifierData.priceMoney.amount) : 0
            }))
          };
        }
      });
    }

    // Process items with variations and modifiers
    const products = [];

    if (result.objects) {
      const items = result.objects.filter(obj => obj.type === 'ITEM');

      items.forEach(item => {
        const itemData = item.itemData || {};

        if (itemData.isDeleted) return;

        // Get category
        let categoryName = 'Rum Infused Bites';
        if (itemData.categoryId && categories[itemData.categoryId]) {
          const catName = categories[itemData.categoryId].toLowerCase();
          if (catName.includes('gift') || catName.includes('accessory') || catName.includes('wrap')) {
            categoryName = 'Gift Wrap Accessories';
          } else if (catName.includes('rum') || catName.includes('cake') || catName.includes('bite')) {
            categoryName = 'Rum Infused Bites';
          }
        }

        // Get image
        let imageUrl = null;
        if (itemData.imageIds?.length > 0) {
          imageUrl = images[itemData.imageIds[0]];
        }

        // Process variations (sizes, flavors, etc.)
        const variations = [];
        if (itemData.variations) {
          itemData.variations.forEach(variation => {
            const vData = variation.itemVariationData || {};
            variations.push({
              id: variation.id,
              name: vData.name || 'Default',
              price: vData.priceMoney?.amount ? Number(vData.priceMoney.amount) : 0,
              sku: vData.sku || ''
            });
          });
        }

        // Process modifiers (add-ons, gift wrap, etc.)
        const modifiers = [];
        if (itemData.modifierListInfo) {
          itemData.modifierListInfo.forEach(modInfo => {
            const modList = modifierLists[modInfo.modifierListId];
            if (modList) {
              modifiers.push({
                id: modList.id,
                name: modList.name,
                min: modInfo.minSelectedModifiers || 0,
                max: modInfo.maxSelectedModifiers || modList.modifiers.length,
                options: modList.modifiers
              });
            }
          });
        }

        // Use first variation price as default
        const defaultPrice = variations.length > 0 ? variations[0].price : 0;

        products.push({
          id: item.id,
          name: itemData.name || 'Unnamed Product',
          description: itemData.description || '',
          price: defaultPrice,
          category: categoryName,
          imageUrl: imageUrl,
          available: itemData.availableOnline !== false,
          variations: variations,      // Size, flavor options
          modifiers: modifiers         // Add-ons, gift wrap, etc.
        });
      });
    }

    res.status(200).json({
      success: true,
      products: products,
      totalItems: products.length
    });

  } catch (error) {
    console.error('Catalog Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch catalog'
    });
  }
};
