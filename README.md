# A Slice of G - Website Deployment Guide

## 🎉 Your New Website - "Not All Rum Cake Wears Black"

Congratulations! Your stunning bakery website now features your bold brand slogan and automatically pulls products from your Square inventory. This site features:

- ✨ **Your signature slogan** - "Not All Rum Cake Wears Black" as the hero headline
- 🔄 **Automatic product loading** from your Square catalog
- 📊 **Category organization** - Products automatically sorted into "Rum Infused Bites" and "Accessories"
- 💳 **Seamless Square payments** integrated throughout
- 📱 **Fully responsive** design (mobile, tablet, desktop)
- 🎨 **Luxury aesthetic** with smooth animations
- 🛒 **Dynamic inventory** - Add/update products in Square, they appear on your site automatically

## 🚀 Deploy to Vercel (FREE)

### Step 1: Prepare Your Files
1. Create a new folder on your computer called `asliceofg-website`
2. Place ALL these files in the folder:
   - `index.html` (your main website)
   - `package.json` (Square SDK dependencies)
   - `api/` folder containing:
     - `square-catalog.js` (fetches products automatically)
     - `process-payment.js` (handles payments)

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up (use your GitHub, GitLab, or Bitbucket account - recommended)
3. Click "Add New Project"
4. **If using Git (Recommended):**
   - Create a GitHub repository
   - Upload all your files to the repo
   - Connect the repo to Vercel
5. **Or drag and drop:**
   - Drag your entire `asliceofg-website` folder to Vercel
6. Click "Deploy"
7. Wait 30 seconds - Done! 🎉

### Step 3: Connect Your Custom Domain
1. In Vercel dashboard, click on your project
2. Go to "Settings" → "Domains"
3. Add `asliceofg.com`
4. Vercel will show you DNS records
5. Go to your domain registrar (where you bought asliceofg.com)
6. Add the DNS records Vercel provides:
   - A Record: `76.76.21.21`
   - CNAME Record: `cname.vercel-dns.com`
7. Wait 10-30 minutes for DNS to propagate
8. Your site will be live at asliceofg.com with FREE SSL! 🔒

### Step 4: Configure Square Integration (THE MAGIC HAPPENS HERE!)

This is where your products automatically load from Square! Follow carefully:

#### 4.1 Get Your Square Credentials

1. **Sign into Square Dashboard**: [squareup.com/dashboard](https://squareup.com/dashboard)

2. **Create/Select Your Application**:
   - Go to "Apps" in the left menu
   - Click "My Apps"
   - Either select your existing app OR click "+" to create new app
   - Name it "A Slice of G Website"

3. **Get Application ID**:
   - Click on your app
   - You'll see "Application ID" - **copy this**
   - Example: `sq0idp-abc123...`

4. **Get Location ID**:
   - In Square Dashboard, go to "Account & Settings"
   - Click "Locations"
   - Find your location (probably "A Slice of G")
   - Copy the **Location ID**
   - Example: `L123ABC...`

5. **Get Access Token** (IMPORTANT - Keep this SECRET):
   - In your Square App, go to "Credentials" tab
   - You'll see two sections: **Sandbox** (for testing) and **Production** (for real payments)
   - **Start with Sandbox for testing**:
     - Under "Sandbox," find "Sandbox Access Token"
     - Click "Show" and copy it
   - **When ready for real payments**, use Production Access Token

#### 4.2 Add Environment Variables in Vercel

1. In Vercel, go to your project
2. Click "Settings" → "Environment Variables"
3. Add these THREE variables:

   **Variable 1:**
   - Name: `SQUARE_ACCESS_TOKEN`
   - Value: (paste your Sandbox or Production access token)
   - Select: Production, Preview, Development (all three)
   
   **Variable 2:**
   - Name: `SQUARE_LOCATION_ID`
   - Value: (paste your Location ID)
   - Select: Production, Preview, Development
   
   **Variable 3:**
   - Name: `SQUARE_ENVIRONMENT`
   - Value: `sandbox` (for testing) or `production` (for real payments)
   - Select: Production, Preview, Development

4. Click "Save" for each one

#### 4.3 Update Frontend Configuration

1. Open your `index.html` file
2. Find this section (around line 800):
   ```javascript
   const appId = 'YOUR_SQUARE_APPLICATION_ID';
   const locationId = 'YOUR_SQUARE_LOCATION_ID';
   ```
3. Replace with YOUR actual values:
   ```javascript
   const appId = 'sq0idp-abc123...'; // Your Application ID
   const locationId = 'L123ABC...';  // Your Location ID
   ```

4. Find these lines (around line 950):
   ```javascript
   // window.addEventListener('load', () => {
   //     initializeSquarePayments();
   //     loadSquareProducts();
   // });
   ```

5. **UNCOMMENT them** (remove the `//`):
   ```javascript
   window.addEventListener('load', () => {
       initializeSquarePayments();
       loadSquareProducts();
   });
   ```

6. Save and re-deploy to Vercel (just push to Git or re-upload)

#### 4.4 Redeploy Your Site

1. If using Git: Push your changes
   ```bash
   git add .
   git commit -m "Added Square credentials"
   git push
   ```
2. If not using Git: Re-upload your files to Vercel
3. Vercel will automatically rebuild (takes ~30 seconds)

### Step 5: Organize Your Products in Square

**IMPORTANT**: Your products will automatically appear in the correct sections based on their Square categories!

#### How Product Categorization Works:

The website reads your Square categories and automatically sorts products:

- **"Rum Infused Bites" section** gets products with categories containing:
  - "cake", "cookie", "rum", "bite", OR no category at all

- **"Accessories" section** gets products with categories containing:
  - "accessor", "card", "tag"

#### To Set Up Categories in Square:

1. Go to Square Dashboard → "Items & Orders"
2. Click "Categories" in the left sidebar
3. Create these categories if you don't have them:
   - "Rum Cakes"
   - "Rum Cookies"
   - "Accessories"
   - "Gift Cards"
   - "Tags"

4. Edit each product:
   - Click on the product
   - Assign it to the appropriate category
   - Add high-quality photos
   - Write compelling descriptions
   - Set prices

5. **The website will automatically update!**
   - No code changes needed
   - Products appear/disappear based on Square inventory
   - Categories organize products automatically
   - Images, prices, descriptions all sync

## 🎯 How The Automatic Product Loading Works

Your website now has REAL automation! Here's what happens behind the scenes:

1. **You add/edit a product in Square Dashboard**
   - Upload photos
   - Set prices  
   - Write descriptions
   - Assign categories

2. **Customer visits your website**
   - Website calls `/api/square-catalog` 
   - Fetches ALL your products in real-time
   - Organizes them by category
   - Displays with images, prices, descriptions

3. **Customer clicks "Add to Cart"**
   - Square payment form appears
   - Customer enters card details
   - Website calls `/api/process-payment`
   - Square processes the payment
   - Customer gets confirmation

4. **You get paid** 💰
   - Money goes directly to your Square account
   - You see orders in Square Dashboard
   - No manual inventory updates needed!

### Custom Category Mapping

Don't like the automatic categorization? You can customize it!

Edit `api/square-catalog.js` around line 48:

```javascript
// Customize these category mappings
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
```

Add more categories, change the logic - it's all up to you!

## 💳 Testing Payments (IMPORTANT)

**Start with Sandbox Mode:**

1. Use `SQUARE_ENVIRONMENT=sandbox` in Vercel
2. Use Sandbox Access Token
3. Test with Square's test card:
   - Card: `4111 1111 1111 1111`
   - CVV: `111`
   - Expiry: Any future date
   - ZIP: Any 5 digits

4. Test failed payments:
   - Card: `4000 0000 0000 0002`
   - This will decline - test your error handling!

**When Ready for Production:**

1. Change `SQUARE_ENVIRONMENT=production` in Vercel
2. Replace Sandbox Access Token with Production token
3. Redeploy
4. Real payments will now work! 💰

## 🎨 Customization Guide

### Update Your Photos
Replace the placeholder text in the HTML with actual image paths:

```html
<!-- Replace this: -->
<div class="hero-image-container">
    <!-- Hero image placeholder -->
</div>

<!-- With this: -->
<div class="hero-image-container">
    <img src="images/hero-cake.jpg" alt="A Slice of G Rum Cake" style="width: 100%; height: 100%; object-fit: cover;">
</div>
```

### Update Products
Find the products section and update with your actual items:

```html
<div class="product-card scroll-reveal loading">
    <div class="product-image">
        <img src="images/rum-cake.jpg" alt="Rum Cake">
    </div>
    <div class="product-info">
        <h3>Your Product Name</h3>
        <p>Your product description</p>
        <div class="product-price">$XX.XX</div>
        <button class="btn btn-primary" onclick="openPayment('Product Name', XXXX)">Add to Cart</button>
    </div>
</div>
```

### Change Colors
All colors are defined at the top of the CSS (in the `:root` section):

```css
:root {
    --cream: #FFF8F0;           /* Main background */
    --warm-white: #FFFBF5;      /* Secondary background */
    --dark-brown: #2C1810;       /* Dark text and headers */
    --medium-brown: #5C4033;     /* Body text */
    --accent-gold: #D4AF37;      /* Accent color */
    --soft-pink: #F4E4E1;        /* Soft accents */
}
```

Simply change these hex codes to update the entire site's color scheme!

### Update Text Content
All text is directly in the HTML. Search for and replace:
- Company descriptions
- Product descriptions
- Contact information
- Social media handles

## 📱 Adding Your Images

### Image Optimization Tips:
1. **Hero Image**: 1200x1500px (portrait)
2. **Product Images**: 800x800px (square)
3. **About Image**: 1200x900px (landscape)
4. Use JPG for photos (better compression)
5. Use PNG for graphics with transparency
6. Compress images before uploading (use tinypng.com)

### Folder Structure:
```
asliceofg-website/
├── index.html
├── images/
│   ├── hero-cake.jpg
│   ├── product-1.jpg
│   ├── product-2.jpg
│   ├── about-us.jpg
│   └── ...
└── api/
    └── square-products.js (if using Square integration)
```

## 🔧 Backend for Payment Processing

For production payments, you need a backend endpoint. Here's a simple example:

### Vercel Function: `/api/process-payment.js`

```javascript
const { Client, Environment } = require('square');

const client = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Production
});

module.exports = async (req, res) => {
  const { token, amount, itemName } = req.body;
  
  try {
    const response = await client.paymentsApi.createPayment({
      sourceId: token,
      amountMoney: {
        amount: amount,
        currency: 'USD'
      },
      idempotencyKey: `${Date.now()}-${Math.random()}`,
      note: itemName
    });
    
    res.status(200).json({ success: true, payment: response.result.payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

Then update the `processPayment` function in index.html:

```javascript
async function processPayment(token, amount, itemName) {
    const response = await fetch('/api/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, amount, itemName })
    });
    
    const result = await response.json();
    
    if (result.success) {
        showPaymentStatus('success', `Payment successful! Thank you for ordering ${itemName}.`);
    } else {
        showPaymentStatus('error', 'Payment failed. Please try again.');
    }
}
```

## 📊 Analytics & SEO

### Add Google Analytics:
Add before `</head>`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Add Meta Tags for SEO:
Add in `<head>`:
```html
<meta name="description" content="A Slice of G - Artisan rum-infused cakes and cookies, handcrafted with premium Caribbean rum. Toronto's premier bakery for custom cakes and catering.">
<meta name="keywords" content="rum cake, rum cookies, bakery Toronto, custom cakes, catering, artisan bakery">
<meta property="og:title" content="A Slice of G | Artisan Rum-Infused Baked Goods">
<meta property="og:description" content="Handcrafted rum-infused cakes and cookies made with premium ingredients">
<meta property="og:image" content="https://asliceofg.com/images/hero-cake.jpg">
<meta property="og:url" content="https://asliceofg.com">
<meta name="twitter:card" content="summary_large_image">
```

## 🎯 Next Steps - Your Launch Checklist

### Phase 1: Setup (30 minutes)
1. ✅ Deploy to Vercel
2. ✅ Connect your domain (asliceofg.com)
3. ✅ Add Square credentials to Vercel environment variables
4. ✅ Update Application ID and Location ID in index.html
5. ✅ Uncomment the Square initialization code
6. ✅ Redeploy

### Phase 2: Content (1-2 hours)
1. ✅ Organize products in Square with proper categories
2. ✅ Upload high-quality photos to Square products
3. ✅ Write compelling descriptions in Square
4. ✅ Test that products appear on your site correctly
5. ✅ Replace hero image placeholder with your best cake photo
6. ✅ Update About Us section with your story

### Phase 3: Testing (30 minutes)
1. ✅ Test payment flow with Sandbox mode
2. ✅ Test on mobile devices
3. ✅ Check all links work
4. ✅ Verify Instagram link goes to @_sliceofg
5. ✅ Test contact form

### Phase 4: Launch! 🚀
1. ✅ Switch to Production environment
2. ✅ Change to Production access token
3. ✅ Make a test real purchase (buy yourself a cake!)
4. ✅ Share your new site on Instagram
5. ✅ Update all your marketing materials
6. ✅ Celebrate! 🎉

## 🎨 Customization Guide

### Update Your Slogan or Hero Text

Find this section in `index.html` (around line 550):

```html
<h1>Not All<br>Rum Cake<br>Wears Black</h1>
<p class="subtitle">A Slice of G - Where Tradition Meets Innovation</p>
```

Change the text to anything you want!

## 💡 Pro Tips

- **Test payments in Sandbox mode first** - Square provides a sandbox environment
- **Use high-quality photos** - Your products deserve it!
- **Update Instagram regularly** - The feed integration will drive traffic
- **Consider adding a blog** - Great for SEO and sharing recipes/stories
- **Set up email marketing** - Collect emails through the contact form

## 🆘 Need Help?

Common issues and solutions:

**Payment not working?**
- Check that you've added your Square credentials
- Make sure you uncommented the initialization line
- Verify your Square app is in Production mode (not Sandbox)

**Images not showing?**
- Check file paths are correct
- Ensure images are in the same folder or proper subfolder
- Image filenames are case-sensitive!

**Domain not connecting?**
- DNS can take up to 48 hours to propagate
- Double-check you added the correct records
- Clear your browser cache

**Mobile menu not working?**
- Make sure JavaScript is enabled
- Check browser console for errors

## 📞 Support

For Square API questions: [Square Developer Docs](https://developer.squareup.com)
For Vercel deployment help: [Vercel Documentation](https://vercel.com/docs)

---

**You're all set!** Your website is infinitely better than Square's platform and you have full control. Welcome to freedom! 🎉🍰
