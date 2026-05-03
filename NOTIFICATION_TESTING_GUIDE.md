# Notification System Testing Guide

## 🚀 Quick Start

1. **Start the development server**:
   ```bash
   cd Bookora/appoints
   npm run dev
   ```

2. **Navigate to the test page**:
   ```
   http://localhost:3000/test-notifications
   ```

3. **Make sure you're logged in** (required for bell notifications)

## 📋 Test Checklist

### ✅ Toast Notifications

#### Basic Toast Types
- [ ] **Success Toast**: Click "Success" button
  - Should show green toast with checkmark icon
  - Should play ascending tri-tone sound
  - Should auto-dismiss after 5 seconds
  - Should have smooth slide-in animation

- [ ] **Error Toast**: Click "Error" button
  - Should show red toast with X icon
  - Should play descending error sound
  - Should auto-dismiss after 5 seconds

- [ ] **Warning Toast**: Click "Warning" button
  - Should show orange toast with warning icon
  - Should play standard notification sound
  - Should auto-dismiss after 5 seconds

- [ ] **Info Toast**: Click "Info" button
  - Should show blue toast with info icon
  - Should play standard notification sound
  - Should have action button

- [ ] **Message Toast**: Click "Message" button
  - Should show purple toast with message icon
  - Should play standard notification sound
  - Should have action button

- [ ] **Booking Toast**: Click "Booking" button
  - Should show blue toast with calendar icon
  - Should play standard notification sound

- [ ] **Update Toast**: Click "Update" button
  - Should show gold toast with refresh icon
  - Should play standard notification sound
  - Should have action button

#### Toast Features
- [ ] **Multiple Toasts**: Click several buttons quickly
  - Should stack vertically
  - Should not overlap
  - Should maintain order (newest on top)

- [ ] **Manual Close**: Click X button on any toast
  - Should close immediately with fade-out animation
  - Should not affect other toasts

- [ ] **Action Buttons**: Click action button on toast with action
  - Should navigate to specified URL
  - Toast should remain visible

- [ ] **Auto-dismiss**: Wait for toast to auto-dismiss
  - Should fade out smoothly
  - Should slide to the right
  - Should disappear after animation

### ✅ Sound Effects

#### Audio Initialization
- [ ] **Enable Sound**: Click "Enable Sound Effects" button
  - Should show success toast
  - Should enable all sounds
  - Warning banner should disappear

#### Sound Types
- [ ] **Notification Sound**: Click "Notification Sound" button
  - Should play tri-tone (C6-E6-G6)
  - Should be clear and pleasant
  - Should last ~0.5 seconds

- [ ] **Success Sound**: Click "Success Sound" button
  - Should play ascending tri-tone (C5-E5-G5)
  - Should sound higher pitched than notification
  - Should be quick and cheerful

- [ ] **Error Sound**: Click "Error Sound" button
  - Should play descending tone (G4-F4)
  - Should sound lower and more serious
  - Should be distinct from success

#### Sound Integration
- [ ] **Toast + Sound**: Show any toast
  - Sound should play when toast appears
  - Sound should match toast type
  - Sound should not overlap if multiple toasts

### ✅ Bell Notifications

#### Creating Notifications
- [ ] **Create Test Notification**: Click "Create Test Notification in Bell"
  - Should show success toast
  - Should create notification in database
  - Bell icon should update within 10 seconds (polling interval)

#### Bell Icon
- [ ] **Unread Badge**: After creating notification
  - Red badge should appear on bell icon
  - Badge should show count (1, 2, 3, etc.)
  - Badge should animate (pulse effect)
  - Badge should show "9+" for 10 or more

#### Notification Dropdown
- [ ] **Open Dropdown**: Click bell icon
  - Dropdown should appear below bell
  - Should show list of notifications
  - Should have smooth fade-in animation

- [ ] **Notification List**: Check notification list
  - Should show most recent first
  - Unread notifications should have cream background
  - Each notification should show:
    - Icon (based on type)
    - Title (bold)
    - Message
    - Timestamp (relative: "Just now", "5m ago", etc.)
    - Unread indicator (purple dot)

- [ ] **Click Notification**: Click any notification
  - Should mark as read
  - Background should change to white
  - Purple dot should disappear
  - If has action URL, should navigate

- [ ] **Mark All as Read**: Click "Mark all as read"
  - All notifications should be marked as read
  - Badge should disappear
  - Dropdown should close

- [ ] **Close Dropdown**: Click outside dropdown
  - Dropdown should close smoothly
  - Bell icon should remain visible

#### Real-time Updates
- [ ] **Polling**: Wait 10 seconds after creating notification
  - Bell should update automatically
  - Badge count should update
  - No page refresh needed

- [ ] **New Notification Sound**: Create notification while on page
  - Should play notification sound when count increases
  - Should only play for NEW notifications (not on page load)

### ✅ Real-World Scenarios

#### Booking Flow
- [ ] **Click "Booking Flow" button**
  - Should show "Booking Request Sent" toast
  - After 3 seconds, should show "Booking Confirmed" toast
  - Should play sounds for both toasts
  - Second toast should have action button

#### Service Creation
- [ ] **Click "Service Creation" button**
  - Should show "Service Created" toast
  - After 2 seconds, should show "Configure Schedule" reminder
  - Should demonstrate multi-step notification flow

#### New Message
- [ ] **Click "New Message" button**
  - Should show message toast with purple styling
  - Should have "Reply" action button
  - Should play notification sound

#### Cancellation
- [ ] **Click "Cancellation" button**
  - Should show warning toast
  - Should use orange/warning styling
  - Should play notification sound

### ✅ Responsive Design

#### Desktop (1920x1080)
- [ ] Toasts appear in top-right corner
- [ ] Toasts are 320px wide
- [ ] Bell dropdown is 384px wide
- [ ] All text is readable
- [ ] Buttons are clickable

#### Tablet (768x1024)
- [ ] Toasts appear in top-right corner
- [ ] Toasts adjust to screen width
- [ ] Bell dropdown adjusts to screen width
- [ ] Touch targets are adequate

#### Mobile (375x667)
- [ ] Toasts appear at top
- [ ] Toasts are full width minus margins
- [ ] Bell dropdown is full width minus margins
- [ ] All content is accessible
- [ ] Touch targets are large enough

### ✅ Browser Compatibility

#### Chrome/Edge
- [ ] All features work
- [ ] Sounds play correctly
- [ ] Animations are smooth
- [ ] No console errors

#### Firefox
- [ ] All features work
- [ ] Sounds play correctly
- [ ] Animations are smooth
- [ ] No console errors

#### Safari
- [ ] All features work
- [ ] Sounds play correctly (may need user interaction first)
- [ ] Animations are smooth
- [ ] No console errors

#### Mobile Safari (iOS)
- [ ] All features work
- [ ] Sounds play after user interaction
- [ ] Touch interactions work
- [ ] Animations are smooth

### ✅ Performance

#### Memory
- [ ] Open browser DevTools → Performance
- [ ] Create 10 notifications rapidly
- [ ] Check memory usage
  - Should not increase significantly
  - Old toasts should be garbage collected

#### Network
- [ ] Open browser DevTools → Network
- [ ] Check notification polling
  - Should poll every 10 seconds
  - Should use minimal bandwidth
  - Should handle 304 Not Modified responses

#### Rendering
- [ ] Create multiple toasts
- [ ] Check for layout shifts
  - Toasts should not cause page reflow
  - Other content should not move

### ✅ Accessibility

#### Keyboard Navigation
- [ ] Tab to bell icon
  - Should show focus ring
  - Enter/Space should open dropdown

- [ ] Tab through dropdown
  - Should focus on "Mark all as read" button
  - Should focus on each notification
  - Should focus on "View all" link

- [ ] Tab to toast close button
  - Should show focus ring
  - Enter/Space should close toast

#### Screen Readers
- [ ] Use screen reader (NVDA, JAWS, VoiceOver)
- [ ] Navigate to bell icon
  - Should announce "Notifications" and unread count
- [ ] Open dropdown
  - Should announce notification content
- [ ] Show toast
  - Should announce toast content (aria-live region)

#### Color Contrast
- [ ] Check all toast types
  - Text should have 4.5:1 contrast ratio
  - Icons should be distinguishable
- [ ] Check bell dropdown
  - All text should be readable
  - Unread indicator should be visible

## 🐛 Common Issues & Solutions

### Issue: Sounds Don't Play
**Solution**: Click "Enable Sound Effects" button first. Browsers require user interaction before playing audio.

### Issue: Bell Badge Doesn't Update
**Solution**: Wait 10 seconds for polling, or refresh the page. Check that you're logged in.

### Issue: Toasts Don't Appear
**Solution**: Check browser console for errors. Make sure ToastContainer is in layout.tsx.

### Issue: Dropdown Doesn't Close
**Solution**: Click outside the dropdown or press Escape key.

### Issue: Notifications Not Created
**Solution**: Make sure you're logged in. Check API endpoint is working.

## 📊 Test Results Template

```
Date: ___________
Tester: ___________
Browser: ___________
Device: ___________

Toast Notifications: ☐ Pass ☐ Fail
Sound Effects: ☐ Pass ☐ Fail
Bell Notifications: ☐ Pass ☐ Fail
Real-World Scenarios: ☐ Pass ☐ Fail
Responsive Design: ☐ Pass ☐ Fail
Browser Compatibility: ☐ Pass ☐ Fail
Performance: ☐ Pass ☐ Fail
Accessibility: ☐ Pass ☐ Fail

Notes:
_________________________________
_________________________________
_________________________________
```

## 🎯 Next Steps After Testing

1. **If all tests pass**: System is ready for production!
2. **If tests fail**: Document issues and fix them
3. **Integration**: Add notifications to actual booking flow
4. **Monitoring**: Set up error tracking for production
5. **User Feedback**: Collect feedback from beta users

## 📝 Additional Testing

### Load Testing
```bash
# Create 100 notifications rapidly
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/notifications/test \
    -H "Content-Type: application/json" \
    -d '{"title":"Test '$i'","message":"Load test notification"}'
done
```

### Stress Testing
- Open multiple browser tabs
- Create notifications in each tab
- Verify all tabs update correctly
- Check for race conditions

### Edge Cases
- [ ] Very long notification titles (100+ characters)
- [ ] Very long notification messages (500+ characters)
- [ ] Special characters in messages (emoji, unicode)
- [ ] Rapid clicking (10+ toasts in 1 second)
- [ ] Network offline (should queue and retry)
- [ ] Browser tab inactive (should still update)

## 🔗 Related Documentation

- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Full implementation details
- [TOAST_NOTIFICATIONS_GUIDE.md](./TOAST_NOTIFICATIONS_GUIDE.md) - Toast usage guide
- [CHANGES_SUMMARY.md](./CHANGES_SUMMARY.md) - Summary of all changes

## ✅ Sign-off

Once all tests pass, sign off here:

```
Tested by: ___________
Date: ___________
Signature: ___________

Status: ☐ Approved for Production ☐ Needs Fixes
```
