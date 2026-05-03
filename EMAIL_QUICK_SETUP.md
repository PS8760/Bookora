# 📧 Email Notifications - Quick Setup

## ✅ Status: READY TO USE

Email notifications are fully integrated and ready to send!

---

## 🚀 Quick Setup (2 minutes)

### Step 1: Get Resend API Key

1. **Go to:** https://resend.com
2. **Sign up** (free - 3,000 emails/month)
3. **Go to:** https://resend.com/api-keys
4. **Click "Create API Key"**
5. **Copy the key** (starts with `re_`)

### Step 2: Add to .env

```env
RESEND_API_KEY=re_your_actual_api_key_here
EMAIL_FROM="Bookora <noreply@bookora.com>"
```

### Step 3: Test It!

```typescript
// Test email sending
import { sendEmail } from "@/lib/email";

await sendEmail({
  to: "your@email.com",
  subject: "Test Email",
  html: "<h1>It works!</h1>",
});
```

**That's it!** Emails will now be sent automatically! 🎉

---

## 📧 What Emails Are Sent?

### Automatic Emails:

✅ **Booking Confirmed** - When booking is confirmed
✅ **Booking Pending** - When booking needs approval
✅ **Booking Cancelled** - When booking is cancelled
✅ **Booking Reminder** - Before appointment
✅ **New Booking Request** - To organiser
✅ **Payment Received** - After successful payment
✅ **Refund Processed** - After refund
✅ **Service Published** - When service goes live
✅ **Role Changed** - When user role changes
✅ **Welcome Email** - For new users

---

## 🧪 Quick Test

### Test Booking Confirmation:

1. **Create a booking** (as customer)
2. **Confirm it** (as organiser)
3. **Check email** - Should receive confirmation!

### Test Custom Email:

```typescript
import { sendEmail } from "@/lib/email";

await sendEmail({
  to: "test@example.com",
  subject: "Hello from Bookora!",
  html: `
    <h1>Test Email</h1>
    <p>This is a test email from Bookora.</p>
  `,
});
```

---

## 📊 Email Templates

All emails include:
- ✅ Beautiful design
- ✅ Bookora branding
- ✅ Responsive layout
- ✅ Call-to-action buttons
- ✅ Professional styling

---

## 🔧 Configuration

### Development (Default):
```env
RESEND_API_KEY=re_your_key
EMAIL_FROM="Bookora <noreply@bookora.com>"
```
Emails sent from `onboarding@resend.dev`

### Production (Custom Domain):
1. Add domain in Resend dashboard
2. Add DNS records
3. Update `.env`:
```env
EMAIL_FROM="Bookora <noreply@yourdomain.com>"
```

---

## 📚 Full Documentation

See `EMAIL_INTEGRATION_GUIDE.md` for:
- Complete API reference
- All email templates
- Customization guide
- Troubleshooting
- Production checklist

---

## ✅ Verification

After setup, verify:

1. **API key set:**
   ```bash
   echo $RESEND_API_KEY
   ```

2. **Test email:**
   - Create booking
   - Confirm booking
   - Check inbox

3. **Check Resend dashboard:**
   - Go to https://resend.com/emails
   - See sent emails

---

## 🎉 Done!

Email notifications are ready!

**Next steps:**
1. Add API key to `.env`
2. Test with a booking
3. Check your inbox
4. Customize templates (optional)

**Everything works automatically!** 📧✨
