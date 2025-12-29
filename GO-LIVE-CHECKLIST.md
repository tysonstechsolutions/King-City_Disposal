# 🚀 GO LIVE CHECKLIST

**For when you're ready to turn everything on!**

This checklist walks you through activating all the features that require the business owner's information.

---

## ✅ ALREADY DONE (Tyson set these up)

- [x] Website live at kingcitydisposal.com
- [x] All pages working (Home, Pricing, FAQ, etc.)
- [x] Chatbot working
- [x] Database storing bookings (Supabase)
- [x] Admin dashboard at /admin

---

## 📱 STEP 1: Twilio SMS (Get text notifications)

**Time:** 10-15 minutes  
**Cost:** ~$2-5/month

### What You Need From the Business Owner:
- Government ID (for Twilio business verification)
- Business address
- Their cell phone number (to receive notifications)

### Steps:
1. Go to [twilio.com](https://twilio.com) — you already have an account
2. Complete business verification (requires ID upload)
3. Buy a phone number with area code 618
4. Go to **Vercel → Your Project → Settings → Environment Variables**
5. Add these 4 variables:
   ```
   TWILIO_ACCOUNT_SID = (from Twilio console)
   TWILIO_AUTH_TOKEN = (from Twilio console)
   TWILIO_PHONE_NUMBER = +16185551234 (the number you bought)
   OWNER_PHONE = +16185551234 (owner's cell to receive alerts)
   ```
6. Open `src/config.js` and change:
   ```javascript
   twilio: {
     enabled: true,  // ← Change false to true
   }
   ```
7. Push update to GitHub → Vercel auto-deploys

---

## 💳 STEP 2: Stripe Payments (Accept credit cards)

**Time:** 15-20 minutes  
**Cost:** 2.9% + $0.30 per transaction (no monthly fee)

### What You Need From the Business Owner:
- Bank account (routing + account number)
- SSN or EIN
- Business address

### Steps:
1. Go to [stripe.com](https://stripe.com) — create account or login
2. Complete business verification
3. Get your API keys from Dashboard → Developers → API Keys
4. Go to **Vercel → Your Project → Settings → Environment Variables**
5. Add these 2 variables:
   ```
   STRIPE_PUBLISHABLE_KEY = pk_live_... (from Stripe)
   STRIPE_SECRET_KEY = sk_live_... (from Stripe)
   ```
6. Open `src/config.js` and change:
   ```javascript
   payments: {
     enabled: true,  // ← Change false to true
     requirePaymentUpfront: true,  // ← Charge at booking
   }
   ```
7. Push update to GitHub → Vercel auto-deploys

---

## 📍 STEP 3: Google Business Profile (Get found on Google)

**Time:** 15 minutes + 5 days for postcard verification  
**Cost:** FREE (and MOST IMPORTANT for getting customers!)

### What You Need:
- Business owner present (they verify ownership)
- Business address
- Phone number

### Steps:
1. Go to [business.google.com](https://business.google.com)
2. Click "Manage now"
3. Search for "King City Disposal" — if not found, add it
4. Enter business details:
   - Name: King City Disposal
   - Category: Dumpster Rental Service
   - Address: Mount Vernon, IL
   - Phone: (618) 214-7656
   - Website: kingcitydisposal.com
5. Choose verification method (usually postcard)
6. Wait for postcard, enter code
7. Add photos of trucks/dumpsters
8. Add business hours
9. Update `src/config.js` with the profile URL:
   ```javascript
   social: {
     google: "https://g.page/...",  // ← Your profile URL
   }
   ```

---

## 📸 STEP 4: Replace Placeholder Images

### Photos Needed:
- [ ] 14-yard dumpster (from front angle)
- [ ] 20-yard dumpster (from front angle)
- [ ] 30-yard dumpster (from front angle)
- [ ] Truck with dumpster
- [ ] Team photo (optional)

### Steps:
1. Take photos in good lighting
2. Rename files to: `14-yard.jpg`, `20-yard.jpg`, `30-yard.jpg`
3. Replace files in `/public/images/`
4. Push to GitHub

---

## 📧 STEP 5: Update Email Address

When ready to use their real email:

1. Open `src/config.js`
2. Change:
   ```javascript
   email: "their-real-email@gmail.com",
   bookingAlertEmail: "their-real-email@gmail.com",
   ```
3. Push to GitHub

---

## 🔐 STEP 6: Change Admin Password

The default admin password is `kingcity2024`. Change it!

1. Open `src/config.js`
2. Change:
   ```javascript
   admin: {
     password: "their-secure-password",
   }
   ```
3. Push to GitHub

---

## 📋 QUICK REFERENCE: Config File Locations

Everything is in **ONE FILE**: `src/config.js`

| Setting | Line to Find |
|---------|--------------|
| Phone number | `phone:` |
| Email | `email:` and `bookingAlertEmail:` |
| Twilio keys | `notifications: { twilio:` |
| Stripe keys | `payments: { stripe:` |
| Prices | `dumpsters: [` |
| Admin password | `admin: { password:` |

---

## 🆘 NEED HELP?

If you get stuck:
1. Take a screenshot of the error
2. Ask Claude (in this same project) — I have all the context!
3. Or check the Vercel deployment logs

---

## 🎁 GIFT PRESENTATION IDEA

Show them:
1. The live website: **kingcitydisposal.com**
2. Walk through the chatbot booking flow
3. Show the admin panel at **/admin** (password: kingcity2024)
4. Explain: "This is ready to go — we just need to add your bank account for payments and verify the phone number"

**Merry Christmas! 🎄**
