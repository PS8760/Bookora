# Notification System Diagnostic Guide

## ✅ System Status: FULLY IMPLEMENTED

The notification system is complete and should be working. If notifications aren't appearing, follow this diagnostic checklist:

---

## 🔍 Diagnostic Checklist

### 1. **Database Check**
Verify notifications are being created in the database:

```sql
-- Check if notifications exist
SELECT * FROM notifications ORDER BY "createdAt" DESC LIMIT 10;

-- Check unread notifications for a specific user
SELECT * FROM notifications 
WHERE "userId" = 'YOUR_USER_ID' 
AND channel = 'PUSH' 
AND status = 'QUEUED';

-- Check admin users
SELECT id, name, email, role FROM "user" WHERE role = 'admin';
```

### 2. **User Authentication**
- ✅ User must be logged in
- ✅ Session must be valid
- ✅ Check browser console for auth errors

### 3. **Admin Contact Flow**
When a user sends a message to admin:

**Step 1:** POST `/api/admin/contact`
- Creates notifications for ALL admin users
- Channel: `PUSH` and `EMAIL`
- Status: `QUEUED`

**Step 2:** Notification Bell polls `/api/notifications` every 10 seconds
- Fetches notifications where `channel = 'PUSH'` and `status = 'QUEUED'`
- Displays unread count badge

**Step 3:** User clicks notification
- Marks as read via POST `/api/notifications/read`
- Updates `status` to `'SENT'`

---

## 🧪 Testing Steps

### Test 1: Create Test Notification
1. Go to `/test-notifications`
2. Click "Create Test Notification"
3. Check the bell icon (top-right) - should show badge
4. Click bell - notification should appear
5. Click notification - badge should disappear

### Test 2: Send Message to Admin
1. Go to `/test-notifications` OR `/contact-admin`
2. Click "Send Message to Admin" (or fill form)
3. **If you're logged in as admin:**
   - Wait up to 10 seconds (polling interval)
   - Bell icon should show badge
   - Click bell to see notification
4. **If you're logged in as regular user:**
   - You won't see the notification (it goes to admins)
   - Log in as admin to verify

### Test 3: Real-World Scenario
1. Create two accounts:
   - Account A: Regular user
   - Account B: Admin user (set role in database)
2. Log in as Account A
3. Go to `/contact-admin`
4. Send a message
5. Log in as Account B
6. Within 10 seconds, bell should show notification

---

## 🐛 Common Issues & Solutions

### Issue 1: "No notifications appearing"
**Possible causes:**
- Not logged in as admin when testing admin notifications
- Polling hasn't triggered yet (wait 10 seconds)
- Database connection issue

**Solution:**
```bash
# Check database connection
cd Bookora/appoints
npx prisma db pull

# Check if notifications table exists
npx prisma studio
# Navigate to "notifications" table
```

### Issue 2: "Bell icon not showing badge"
**Possible causes:**
- No unread notifications (`status = 'QUEUED'`)
- User ID mismatch
- API endpoint returning error

**Solution:**
1. Open browser DevTools → Network tab
2. Look for `/api/notifications` requests
3. Check response - should have `unreadCount` > 0
4. If error, check console for details

### Issue 3: "Notifications marked as read immediately"
**Possible causes:**
- Notifications created with `status = 'SENT'` instead of `'QUEUED'`

**Solution:**
Check `/api/admin/contact` - should create with `status: "QUEUED"`:
```typescript
await prisma.notification.createMany({
  data: notifications.map(n => ({
    ...n,
    status: "QUEUED", // ← Must be QUEUED for unread
  })),
});
```

### Issue 4: "Sound not playing"
**Possible causes:**
- Audio not initialized (browser autoplay policy)

**Solution:**
1. Go to `/test-notifications`
2. Click "Enable Sound Effects" button
3. Test sounds

---

## 📊 API Endpoints Reference

### GET `/api/notifications`
**Purpose:** Fetch user's notifications
**Auth:** Required
**Query params:**
- `limit` (optional): Max notifications to return (default: 50)
- `unreadOnly` (optional): Only unread notifications

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "info",
      "title": "Subject",
      "message": "Body",
      "timestamp": "2024-01-01T00:00:00Z",
      "read": false,
      "actionUrl": "/dashboard/bookings/123"
    }
  ],
  "unreadCount": 5
}
```

### POST `/api/notifications/read`
**Purpose:** Mark notifications as read
**Auth:** Required
**Body:**
```json
{
  "notificationIds": ["uuid1", "uuid2"] // Optional: omit to mark all as read
}
```

### POST `/api/admin/contact`
**Purpose:** Send message to all admins
**Auth:** Required
**Body:**
```json
{
  "category": "General",
  "subject": "Need help",
  "message": "Message content"
}
```

**What it does:**
1. Finds all users with `role = 'admin'` and `isActive = true`
2. Creates notification for each admin
3. Creates conversation and message records
4. Returns count of admins notified

---

## 🔧 Manual Database Verification

If notifications still aren't working, manually verify in database:

```sql
-- 1. Check if admin users exist
SELECT id, name, email, role, "isActive" 
FROM "user" 
WHERE role = 'admin';

-- 2. Send test message via contact form
-- Then check if notifications were created:
SELECT n.id, n."userId", n.subject, n.body, n.status, n.channel, n."createdAt",
       u.name, u.email, u.role
FROM notifications n
JOIN "user" u ON n."userId" = u.id
WHERE n."createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY n."createdAt" DESC;

-- 3. Check unread count for specific admin
SELECT COUNT(*) as unread_count
FROM notifications
WHERE "userId" = 'ADMIN_USER_ID'
AND channel = 'PUSH'
AND status = 'QUEUED';

-- 4. Manually create test notification
INSERT INTO notifications (id, "userId", channel, status, subject, body, "createdAt")
VALUES (
  gen_random_uuid(),
  'YOUR_USER_ID',
  'PUSH',
  'QUEUED',
  'Test Notification',
  'This is a manual test notification',
  NOW()
);
```

---

## ✅ Expected Behavior

### When User Sends Message to Admin:

1. **User sees:**
   - Success toast: "Message Sent! 📨"
   - Confirmation that message was sent to X admins

2. **Admin sees (within 10 seconds):**
   - Bell icon badge with unread count
   - Notification sound plays (if audio initialized)
   - Clicking bell shows notification with message preview

3. **Database contains:**
   - Notification record with `status = 'QUEUED'`
   - Conversation record with `type = 'SUPPORT'`
   - Message record with content

### Polling Behavior:
- NotificationBell component polls every 10 seconds
- Fetches `/api/notifications?limit=10`
- Compares `unreadCount` with previous value
- If increased, plays sound and updates badge

---

## 🎯 Quick Test Command

Run this in browser console while logged in:

```javascript
// Test 1: Check current notifications
fetch('/api/notifications')
  .then(r => r.json())
  .then(data => console.log('Notifications:', data));

// Test 2: Create test notification
fetch('/api/notifications/test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'info',
    title: 'Console Test',
    message: 'Testing from console'
  })
})
  .then(r => r.json())
  .then(data => console.log('Created:', data));

// Test 3: Send message to admin
fetch('/api/admin/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    category: 'Test',
    subject: 'Console Test Message',
    message: 'Testing admin notification from console'
  })
})
  .then(r => r.json())
  .then(data => console.log('Admin message:', data));
```

---

## 📝 Summary

The notification system is **fully implemented** and should work correctly. If notifications aren't appearing:

1. ✅ Verify you're logged in as an admin user
2. ✅ Wait 10 seconds for polling to trigger
3. ✅ Check browser console for errors
4. ✅ Verify database has notification records
5. ✅ Use `/test-notifications` page for comprehensive testing

**Most common issue:** Testing with a non-admin account. Admin notifications only appear for users with `role = 'admin'` in the database.
