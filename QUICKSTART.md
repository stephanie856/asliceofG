# 🚀 QUICK START GUIDE - A Slice of G

## What You Got

✅ **Hero Header**: "Not All Rum Cake Wears Black" - Your signature slogan!
✅ **Automatic Product Sync**: Products load directly from Square
✅ **Category Organization**: Auto-sorts into "Rum Infused Bites" and "Accessories"
✅ **Payment Processing**: Full Square checkout integration
✅ **Mobile Responsive**: Looks perfect on all devices

## File Structure

```
asliceofg-website/
├── index.html              (Your main website)
├── package.json            (Square SDK dependency)
├── README.md              (Full documentation)
└── api/
    ├── square-catalog.js   (Fetches products from Square)
    └── process-payment.js  (Processes payments)
```

## 3-Minute Setup

### 1️⃣ Deploy to Vercel
- Go to vercel.com
- Sign up with GitHub
- Create new GitHub repo with all these files
- Connect repo to Vercel
- Deploy!

### 2️⃣ Get Square Credentials
Go to Square Dashboard → Apps:
- Copy **Application ID** (starts with sq0idp)
- Copy **Location ID** (starts with L)
- Copy **Access Token** (Sandbox for testing)

### 3️⃣ Add to Vercel
Settings → Environment Variables:
- `SQUARE_ACCESS_TOKEN` = your token
- `SQUARE_LOCATION_ID` = your location
- `SQUARE_ENVIRONMENT` = sandbox

### 4️⃣ Update index.html
Line ~800, add your credentials:
```javascript
const appId = 'sq0idp-YOUR-ID';
const locationId = 'LYOUR-LOCATION';
```

Line ~950, uncomment:
```javascript
window.addEventListener('load', () => {
    initializeSquarePayments();
    loadSquareProducts();
});
```

### 5️⃣ Connect Domain
Vercel → Settings → Domains:
- Add `asliceofg.com`
- Update DNS at registrar
- Wait 10-30 minutes

## How Products Auto-Load

### In Square Dashboard:
1. Create categories: "Rum Cakes", "Accessories", etc.
2. Add products to categories
3. Upload photos
4. Set prices

### On Your Website:
- Products automatically appear!
- Organized by category
- Images, prices, descriptions all sync
- No code changes needed

### Category Rules:
- **"Rum Infused Bites"** = anything with "cake", "cookie", "rum", "bite"
- **"Accessories"** = anything with "accessor", "card", "tag"

## Testing Payments

### Sandbox Mode (Safe Testing):
```
Card Number: 4111 1111 1111 1111
CVV: 111
Expiry: 12/25
ZIP: 12345
```

### When Ready for Real $$$:
1. Change `SQUARE_ENVIRONMENT` to `production`
2. Use Production Access Token
3. Redeploy
4. Make money! 💰

## Common Issues

**Products not showing?**
- Check environment variables in Vercel
- Make sure you uncommented the load functions
- Check browser console for errors
- Verify Square categories are set

**Payments not working?**
- Using correct Application ID?
- Location ID correct?
- Access token valid?
- Try Sandbox mode first

**Domain not connecting?**
- DNS can take 24-48 hours
- Clear browser cache
- Check DNS records at registrar

## Quick Updates

### Change Your Slogan:
Edit `index.html` line ~550:
```html
<h1>Your<br>New<br>Slogan</h1>
```

### Update Colors:
Edit `index.html` line ~50:
```css
:root {
    --cream: #FFF8F0;
    --accent-gold: #D4AF37;
    /* Change these hex codes */
}
```

### Add More Products:
Just add them in Square Dashboard!
- They automatically appear on your site
- No code changes needed

## Support

**Square API Issues:**
- [Square Developer Docs](https://developer.squareup.com)

**Vercel Deployment:**
- [Vercel Documentation](https://vercel.com/docs)

**Questions about the code:**
- Check the full README.md
- Look at comments in the code files

## You're All Set! 🎉

Your website is 1000x better than Square's platform and you have complete control. Every time you update products in Square, your website automatically updates. That's the power of automation!

Now go make some sales! 💰🍰
