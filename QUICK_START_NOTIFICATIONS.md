# 🚀 Quick Start: Testing Notifications

## ⚡ 2-Minute Test

### Step 1: Make yourself an admin
```sql
-- Run this in your database
UPDATE "user" 
SET role = 'admin', "isActive" = true 
WHERE email = 'your@email.com';
```

### Step 2: Go to test page
```
http://localhost:3000/test-notifications
```

### Step 3: Click "Enable Sound Effects"

### Step 4: Click "Send Message to Admin"

### Step 5: Wait 10 seconds and check the bell icon (top-right)
- Should show a red badge with number
- Click bell to see notification
- Click notification to mark as read

---

## 🎯 That's it!

If the badge appears, **the system is working perfectly!**

If not, go to the debug panel:
```
http://localhost:3000/admin/notifications-debug
```

---

## 📋 Common Issues

### "I don't see the badge"
- ✅ Make sure you're logged in as admin
- ✅ Wait 10 seconds (polling interval)
- ✅ Check `/admin/notifications-debug` to verify admin users exist

### "No admin users found"
```sql
-- Make yourself an admin
UPDATE "user" SET role = 'admin' WHERE email = 'your@email.com';
```

### "Notifications created but not showing"
- Check status is "QUEUED" (not "SENT")
- Check channel is "PUSH"
- Refresh the page

---

## 🎉 Success Criteria

You'll know it's working when:
1. ✅ Bell icon shows red badge
2. ✅ Badge has number (e.g., "1", "2")
3. ✅ Clicking bell shows notification
4. ✅ Sound plays (if enabled)
5. ✅ Clicking notification marks it as read

---

## 📚 More Information

- **Full documentation:** `NOTIFICATION_SYSTEM_STATUS.md`
- **Troubleshooting:** `NOTIFICATION_DIAGNOSTIC.md`
- **Testing guide:** `NOTIFICATION_TESTING_GUIDE.md`
- **Debug panel:** `/admin/notifications-debug`
