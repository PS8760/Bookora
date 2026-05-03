# 🧪 Stripe Test Payment Page - Guide

## What You're Seeing

The "UPI test payment page" you're seeing is **Stripe's test mode interface** for UPI payments. This is **expected behavior** in test mode!

---

## 🎯 Understanding Test Mode vs Live Mode

### Test Mode (Current):
- Shows Stripe's test payment interface
- Uses test API keys (`pk_test_...` and `sk_test_...`)
- No real money is charged
- You see test payment pages like the one in your screenshot
- **Purpose:** Testing the integration before going live

### Live Mode (Production):
- Shows real payment interface
- Uses live API keys (`pk_live_...` and `sk_live_...`)
- Real money is charged
- Users see actual payment gateways (Google Pay, PhonePe, etc.)
- **Purpose:** Real transactions with customers

---

## 🧪 How to Test Payments in Test Mode

### Option 1: Test with Card (Recommended for Testing)

Use Stripe's test card numbers:

**Successful Payment:**
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (12/34)
CVC: Any 3 digits (123)
ZIP: Any 5 digits (12345)
```

**Payment Declined:**
```
Card Number: 4000 0000 0000 0002
```

**Insufficient Funds:**
```
Card Number: 4000 0000 0000 9995
```

### Option 2: Test UPI Payment

On the test payment page you're seeing:

1. **Click "AUTHORIZE TEST PAYMENT"** - Simulates successful UPI payment
2. **Click "FAIL TEST PAYMENT"** - Simulates failed UPI payment

This is how you test UPI payments in test mode!

---

## 💳 Enabling Real UPI Payments (Production)

To use **real UPI payments** (Google Pay, PhonePe, Paytm, etc.), you need to:

### Step 1: Activate Your Stripe Account

1. **Go to Stripe Dashboard:**
   ```
   https://dashboard.stripe.com
   ```

2. **Complete account activation:**
   - Provide business details
   - Add bank account
   - Verify identity
   - Complete KYC

### Step 2: Enable UPI Payment Method

1. **Go to Settings → Payment methods**
   ```
   https://dashboard.stripe.com/settings/payment_methods
   ```

2. **Enable "UPI"** under Indian payment methods

3. **Note:** UPI requires:
   - Activated Stripe account
   - Indian business entity
   - INR currency

### Step 3: Switch to Live Mode

1. **Get live API keys:**
   ```
   https://dashboard.stripe.com/apikeys
   ```

2. **Update `.env` with live keys:**
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   ```

3. **Update webhook endpoint:**
   - Use production URL (not localhost)
   - Get new webhook secret for live mode

---

## 🔄 Payment Flow Comparison

### Test Mode (What You're Seeing Now):

```
User clicks "Pay"
    ↓
Redirected to payments.stripe.com
    ↓
Shows "UPI test payment page"
    ↓
Click "AUTHORIZE TEST PAYMENT"
    ↓
Simulates successful payment
    ↓
Redirected to /payment/success
```

### Live Mode (Production):

```
User clicks "Pay"
    ↓
Redirected to Stripe checkout
    ↓
Shows real payment options:
  - Credit/Debit Card
  - UPI (Google Pay, PhonePe, etc.)
  - Net Banking
  - Wallets
    ↓
User completes real payment
    ↓
Redirected to /payment/success
```

---

## 🎨 Customizing Payment Page

### Option 1: Use Stripe Checkout (Current - Recommended)

**Pros:**
- ✅ Hosted by Stripe (secure)
- ✅ PCI compliant
- ✅ Mobile optimized
- ✅ Supports all payment methods
- ✅ No additional setup

**Cons:**
- ❌ Redirects to Stripe domain
- ❌ Limited customization

### Option 2: Embedded Checkout (More Control)

You can embed Stripe checkout in your own page:

```typescript
// In your payment page
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const handlePayment = async () => {
  const stripe = await stripePromise;
  
  // Create checkout session
  const response = await fetch('/api/payments/create-checkout', {
    method: 'POST',
    body: JSON.stringify({ bookingId }),
  });
  
  const { sessionId } = await response.json();
  
  // Redirect to checkout
  await stripe?.redirectToCheckout({ sessionId });
};
```

### Option 3: Custom Payment Form (Advanced)

Build your own payment form using Stripe Elements:

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

This requires more setup but gives full control over UI.

---

## 🧪 Testing Checklist

### In Test Mode:

- [ ] Create checkout session
- [ ] Redirect to Stripe payment page
- [ ] See test payment interface
- [ ] Click "AUTHORIZE TEST PAYMENT" (for UPI)
- [ ] Or use test card: 4242 4242 4242 4242
- [ ] Redirected to success page
- [ ] Payment status updated in database
- [ ] Notifications sent
- [ ] Webhook received

### Before Going Live:

- [ ] Stripe account fully activated
- [ ] UPI payment method enabled
- [ ] Live API keys obtained
- [ ] Webhook endpoint updated to production URL
- [ ] Test with real payment (small amount)
- [ ] Verify real UPI apps work (Google Pay, PhonePe)
- [ ] Test refund process
- [ ] Set up Stripe Radar (fraud prevention)

---

## 🚀 Quick Actions

### To Test Right Now:

1. **On the test payment page you're seeing:**
   - Click **"AUTHORIZE TEST PAYMENT"**
   - This simulates a successful UPI payment
   - You'll be redirected to `/payment/success`

2. **Or use test card:**
   - Go back and select "Card" payment
   - Enter: `4242 4242 4242 4242`
   - Complete payment

### To Enable Real UPI Payments:

1. **Activate Stripe account** (requires business verification)
2. **Enable UPI** in payment methods
3. **Switch to live keys** in `.env`
4. **Test with real payment**

---

## 📊 Payment Methods Supported

### In Test Mode:
- ✅ Test Cards
- ✅ Test UPI (simulated)

### In Live Mode (After Activation):
- ✅ Credit/Debit Cards (Visa, Mastercard, Amex, etc.)
- ✅ UPI (Google Pay, PhonePe, Paytm, BHIM, etc.)
- ✅ Net Banking
- ✅ Wallets (Paytm, Mobikwik, etc.)
- ✅ EMI
- ✅ International cards

---

## 🔍 Troubleshooting

### "Why am I seeing Stripe's test page?"

**Answer:** You're in test mode! This is expected. The test page lets you simulate payments without real money.

**To see real payment interface:**
- Switch to live mode (requires activated Stripe account)
- Use live API keys

### "How do I test UPI without real payment?"

**Answer:** On the test payment page:
1. Click "AUTHORIZE TEST PAYMENT" - Simulates success
2. Click "FAIL TEST PAYMENT" - Simulates failure

### "Can I customize the payment page?"

**Answer:** 
- **Stripe Checkout:** Limited customization (colors, logo)
- **Embedded Checkout:** More control, stays on your domain
- **Custom Form:** Full control, requires more development

### "When will I see real UPI apps?"

**Answer:** Only in live mode with:
- Activated Stripe account
- UPI payment method enabled
- Live API keys
- Real payment attempt

---

## 💡 Recommendations

### For Development/Testing:
1. ✅ Keep using test mode
2. ✅ Use test cards for quick testing
3. ✅ Use "AUTHORIZE TEST PAYMENT" for UPI testing
4. ✅ Test all scenarios (success, failure, refund)

### For Production:
1. ✅ Complete Stripe account activation
2. ✅ Enable UPI and other Indian payment methods
3. ✅ Switch to live API keys
4. ✅ Test with small real payment first
5. ✅ Monitor Stripe Dashboard for transactions

---

## 📚 Additional Resources

### Stripe Documentation:
- **UPI Payments:** https://stripe.com/docs/payments/upi
- **Test Cards:** https://stripe.com/docs/testing
- **Checkout:** https://stripe.com/docs/payments/checkout
- **Indian Payments:** https://stripe.com/docs/india

### Your Documentation:
- **Complete Guide:** `STRIPE_INTEGRATION_GUIDE.md`
- **Quick Setup:** `STRIPE_SETUP_QUICK.md`

---

## ✅ Summary

**What you're seeing is correct!**

The "UPI test payment page" is Stripe's test interface. To test:
1. Click **"AUTHORIZE TEST PAYMENT"** on that page
2. Or use test card: `4242 4242 4242 4242`

**To get real UPI payments:**
1. Activate Stripe account
2. Enable UPI payment method
3. Switch to live API keys
4. Real users will see actual UPI apps

**For now, continue testing with:**
- Test cards
- "AUTHORIZE TEST PAYMENT" button

The integration is working perfectly! 🎉
