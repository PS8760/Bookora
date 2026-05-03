# 💳 Stripe Integration - Quick Setup

## ✅ Status: COMPLETE

Stripe payment gateway is fully integrated and ready to use!

---

## 🚀 Quick Start (5 minutes)

### Step 1: Add Webhook Secret

1. **Go to Stripe Dashboard:**
   ```
   https://dashboard.stripe.com/test/webhooks
   ```

2. **Click "Add endpoint"**

3. **Add this URL:**
   ```
   http://localhost:3000/api/payments/webhook
   ```

4. **Select these events:**
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`

5. **Copy the webhook secret** (starts with `whsec_`)

6. **Update `.env`:**
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

### Step 2: Test Payment

1. **Enable payment on a service:**
   ```sql
   UPDATE services 
   SET "advancePayment" = true, 
       "paymentAmount" = 100.00,
       currency = 'INR'
   WHERE id = 'your_service_id';
   ```

2. **Book the service** (as customer)

3. **Create checkout session:**
   ```javascript
   const response = await fetch('/api/payments/create-checkout', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ bookingId: 'your_booking_id' })
   });
   
   const { sessionUrl } = await response.json();
   window.location.href = sessionUrl;
   ```

4. **Use test card:**
   ```
   Card: 4242 4242 4242 4242
   Expiry: 12/34
   CVC: 123
   ZIP: 12345
   ```

5. **Complete payment** → Redirected to success page!

---

## 📁 Files Created

### Backend:
- `lib/stripe.ts` - Stripe utilities
- `app/api/payments/create-checkout/route.ts` - Create checkout
- `app/api/payments/webhook/route.ts` - Handle webhooks
- `app/api/payments/[id]/route.ts` - Get payment
- `app/api/payments/[id]/refund/route.ts` - Process refund

### Frontend:
- `app/payment/success/page.tsx` - Success page
- `app/payment/cancel/page.tsx` - Cancel page

### Documentation:
- `STRIPE_INTEGRATION_GUIDE.md` - Complete guide
- `STRIPE_SETUP_QUICK.md` - This file

---

## 🎯 What Works

✅ Create checkout sessions
✅ Process payments via Stripe
✅ Handle webhooks automatically
✅ Update payment status in database
✅ Send notifications (customer + organiser)
✅ Success/Cancel pages
✅ Refund processing
✅ Security & authorization

---

## 🧪 Test Cards

**Success:**
```
4242 4242 4242 4242
```

**Declined:**
```
4000 0000 0000 0002
```

**Insufficient Funds:**
```
4000 0000 0000 9995
```

---

## 📊 Payment Flow

```
User books service
    ↓
POST /api/payments/create-checkout
    ↓
Redirect to Stripe checkout
    ↓
User pays with card
    ↓
Stripe webhook → /api/payments/webhook
    ↓
Update payment status to PAID
    ↓
Send notifications
    ↓
Redirect to /payment/success
```

---

## 🔧 Environment Variables

```env
# Already in your .env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Add this (from Stripe Dashboard → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## ✅ Verification

After setup, verify:

1. **Webhook configured:**
   - Go to Stripe Dashboard → Webhooks
   - Should see your endpoint listed

2. **Payment works:**
   - Book a service
   - Complete payment with test card
   - Check `/payment/success` page

3. **Database updated:**
   ```sql
   SELECT * FROM payments ORDER BY "createdAt" DESC LIMIT 1;
   -- Should show status = 'PAID'
   ```

4. **Notifications sent:**
   - Check notification bell
   - Should see payment confirmation

---

## 🚀 Production

When ready for production:

1. Replace test keys with live keys in `.env`
2. Update webhook URL to production domain
3. Test with real card (small amount)
4. Enable Stripe Radar (fraud prevention)

---

## 📚 Full Documentation

See `STRIPE_INTEGRATION_GUIDE.md` for:
- Complete API reference
- Advanced usage examples
- Troubleshooting guide
- Security best practices
- Production checklist

---

## 🎉 Done!

Stripe is ready to use! Just add the webhook secret and start testing.

**Questions?** Check `STRIPE_INTEGRATION_GUIDE.md`
