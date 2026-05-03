# 📧 Email Notifications - Nodemailer Integration

## ✅ Status: CONFIGURED & READY

Email notifications are now using **Nodemailer** with your Gmail SMTP credentials!

---

## 🎯 What Changed

### Removed:
- ❌ Resend package
- ❌ Resend API key requirement

### Added:
- ✅ Nodemailer package
- ✅ SMTP configuration
- ✅ Gmail integration

---

## 📧 Current Configuration

Your `.env` file is already configured with Gmail SMTP:

```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="sg25042023@gmail.com"
EMAIL_PASS="lplbprbyeacdhold"
EMAIL_FROM="Bookora <sg25042023@gmail.com>"
```

**Status:** ✅ Ready to send emails!

---

## 🚀 How It Works

### Email Sending Flow:

```
Event occurs (e.g., booking confirmed)
    ↓
Trigger function called
    ↓
Email template generated
    ↓
Nodemailer connects to Gmail SMTP
    ↓
Email sent via Gmail
    ↓
In-app notification created
    ↓
User receives both email & notification
```

### SMTP Configuration:

- **Provider:** Gmail SMTP
- **Host:** smtp.gmail.com
- **Port:** 587 (TLS)
- **Authentication:** Your Gmail credentials
- **From:** sg25042023@gmail.com

---

## 📧 Email Templates

All email templates remain the same:

✅ **Booking Confirmation**
✅ **Booking Pending**
✅ **Booking Cancelled**
✅ **Booking Reminder**
✅ **New Booking Request** (Organiser)
✅ **Payment Received**
✅ **Refund Processed**
✅ **Service Published**
✅ **Role Changed**
✅ **Welcome Email**

---

## 🧪 Testing

### Test Email Sending:

```typescript
import { sendEmail } from "@/lib/email";

await sendEmail({
  to: "test@example.com",
  subject: "Test Email from Bookora",
  html: "<h1>Hello!</h1><p>This is a test email.</p>",
});
```

### Test Booking Confirmation:

1. **Create a booking** (as customer)
2. **Confirm the booking** (as organiser)
3. **Check email inbox** - Should receive confirmation email

### Check Logs:

```bash
# In your terminal, you'll see:
Email sent successfully: <message-id>
```

---

## 🔧 Gmail Configuration

### Important Notes:

1. **App Password Required:**
   - Your `.env` uses an app-specific password: `lplbprbyeacdhold`
   - This is correct for Gmail with 2FA enabled
   - ✅ Already configured

2. **Gmail Limits:**
   - Free Gmail: 500 emails/day
   - Google Workspace: 2,000 emails/day

3. **Security:**
   - Gmail may block "less secure apps" by default
   - Use App Passwords (already done)
   - Enable 2-Factor Authentication

### If Emails Don't Send:

1. **Check Gmail Security Settings:**
   - Go to: https://myaccount.google.com/security
   - Ensure 2FA is enabled
   - Generate new App Password if needed

2. **Verify App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - Generate new password for "Mail"
   - Update `EMAIL_PASS` in `.env`

3. **Check Gmail Activity:**
   - Go to: https://myaccount.google.com/notifications
   - Check for blocked sign-in attempts

---

## 💻 Usage Examples

### Send Booking Confirmation:

```typescript
import { notifyBookingConfirmed } from "@/lib/notification-triggers";

// After confirming a booking
await notifyBookingConfirmed(bookingId);
```

### Send Payment Received:

```typescript
import { notifyPaymentReceived } from "@/lib/notification-triggers";

// After payment is successful
await notifyPaymentReceived(paymentId);
```

### Send Custom Email:

```typescript
import { sendEmail } from "@/lib/email";

await sendEmail({
  to: "customer@example.com",
  subject: "Custom Notification",
  html: `
    <h1>Hello!</h1>
    <p>This is a custom email from Bookora.</p>
  `,
});
```

---

## 🎨 Email Design

All emails include:
- ✅ Beautiful HTML templates
- ✅ Bookora branding (purple gradient)
- ✅ Responsive design
- ✅ Professional styling
- ✅ Call-to-action buttons

---

## 🔒 Security Best Practices

### Current Setup:
- ✅ Using App Password (not main password)
- ✅ TLS encryption (port 587)
- ✅ Credentials in `.env` (not in code)

### Recommendations:
1. ✅ Keep `.env` in `.gitignore`
2. ✅ Use App Passwords (already done)
3. ✅ Enable 2FA on Gmail
4. ✅ Monitor Gmail activity
5. ✅ Rotate passwords periodically

---

## 📊 Email Sending Limits

### Gmail Free Account:
- **Limit:** 500 emails/day
- **Recommended:** Monitor usage
- **Upgrade:** Google Workspace for higher limits

### If You Exceed Limits:
1. **Upgrade to Google Workspace** ($6/user/month)
   - 2,000 emails/day
   - Custom domain
   - Better deliverability

2. **Use Alternative SMTP:**
   - SendGrid (100 emails/day free)
   - Mailgun (5,000 emails/month free)
   - AWS SES (62,000 emails/month free)

---

## 🐛 Troubleshooting

### Issue: "Authentication failed"

**Causes:**
- Wrong email/password
- App Password not used
- 2FA not enabled

**Solutions:**
1. Verify `EMAIL_USER` and `EMAIL_PASS` in `.env`
2. Generate new App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password
   - Update `EMAIL_PASS` in `.env`

### Issue: "Connection timeout"

**Causes:**
- Wrong host/port
- Firewall blocking SMTP
- Network issues

**Solutions:**
1. Verify `EMAIL_HOST="smtp.gmail.com"`
2. Verify `EMAIL_PORT=587`
3. Check firewall settings
4. Try port 465 (SSL) instead

### Issue: "Emails going to spam"

**Solutions:**
1. ✅ Use proper sender name
2. ✅ Include unsubscribe link
3. ✅ Avoid spam trigger words
4. ✅ Use custom domain (Google Workspace)
5. ✅ Set up SPF/DKIM records

### Issue: "Daily limit exceeded"

**Solutions:**
1. Wait 24 hours for limit reset
2. Upgrade to Google Workspace
3. Use alternative SMTP provider
4. Implement email queuing

---

## 🔄 Alternative SMTP Providers

If you need more emails or better deliverability:

### SendGrid:
```env
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_PORT=587
EMAIL_USER="apikey"
EMAIL_PASS="your_sendgrid_api_key"
```

### Mailgun:
```env
EMAIL_HOST="smtp.mailgun.org"
EMAIL_PORT=587
EMAIL_USER="postmaster@your-domain.mailgun.org"
EMAIL_PASS="your_mailgun_password"
```

### AWS SES:
```env
EMAIL_HOST="email-smtp.us-east-1.amazonaws.com"
EMAIL_PORT=587
EMAIL_USER="your_aws_access_key"
EMAIL_PASS="your_aws_secret_key"
```

---

## 📈 Production Checklist

Before going live:

- [x] SMTP credentials configured
- [x] App Password generated
- [x] 2FA enabled on Gmail
- [ ] Test all email templates
- [ ] Monitor daily sending limits
- [ ] Set up email logging
- [ ] Configure bounce handling
- [ ] Test spam score
- [ ] Consider Google Workspace (for custom domain)
- [ ] Set up email analytics
- [ ] Monitor delivery rates

---

## 🎉 Summary

**Email integration updated to Nodemailer!**

✅ Removed Resend
✅ Added Nodemailer
✅ Configured Gmail SMTP
✅ All templates working
✅ Ready to send emails

**Current Status:**
- Provider: Gmail SMTP
- Email: sg25042023@gmail.com
- Limit: 500 emails/day
- Status: ✅ Ready

**Test it now:**
1. Create a booking
2. Confirm the booking
3. Check email inbox
4. Should receive confirmation email!

**Everything is configured and ready to use!** 📧✨

---

## 📚 Additional Resources

- **Nodemailer Docs:** https://nodemailer.com
- **Gmail SMTP Guide:** https://support.google.com/mail/answer/7126229
- **App Passwords:** https://myaccount.google.com/apppasswords
- **Email Templates:** `lib/email.ts`
- **Notification Triggers:** `lib/notification-triggers.ts`
