# Toast Notifications Usage Guide

## Overview
The toast notification system provides floating notifications that appear in the top-right corner of the screen for a few seconds. They're perfect for providing immediate feedback to users about actions they've taken.

## Features
- ✅ 6 notification types: success, error, warning, info, message, booking, update
- ✅ Auto-dismiss after 5 seconds (customizable)
- ✅ Sound effects (different sounds for success/error)
- ✅ Smooth animations (slide in from right, fade out)
- ✅ Action buttons with links
- ✅ Manual close button
- ✅ Stacking support (multiple toasts)
- ✅ Responsive design

## Usage

### Basic Usage

```typescript
import { showToast } from "@/components/ToastNotification";

// Simple success toast
showToast({
  type: "success",
  title: "Booking Confirmed!",
  message: "Your appointment has been successfully booked.",
});

// Error toast
showToast({
  type: "error",
  title: "Booking Failed",
  message: "Unable to process your booking. Please try again.",
});

// Warning toast
showToast({
  type: "warning",
  title: "Limited Availability",
  message: "Only 2 slots remaining for this date.",
});

// Info toast
showToast({
  type: "info",
  title: "New Feature",
  message: "Check out our new scheduling options!",
});

// Message toast
showToast({
  type: "message",
  title: "New Message",
  message: "You have a new message from the organiser.",
});

// Booking toast
showToast({
  type: "booking",
  title: "Booking Request Received",
  message: "We'll confirm your booking shortly.",
});

// Update toast
showToast({
  type: "update",
  title: "Service Updated",
  message: "Your service has been successfully updated.",
});
```

### With Action Button

```typescript
showToast({
  type: "success",
  title: "Booking Confirmed!",
  message: "Your appointment for Haircut on Dec 25 at 2:00 PM.",
  actionLabel: "View Details",
  actionUrl: "/dashboard/bookings/123",
});
```

### Custom Duration

```typescript
showToast({
  type: "info",
  title: "Quick Tip",
  message: "This will disappear in 3 seconds.",
  duration: 3000, // 3 seconds
});
```

## Integration Examples

### 1. After Booking Confirmation

```typescript
// In /app/api/bookings/[id]/confirm/route.ts
import { notifyBookingConfirmed } from "@/lib/notifications";

// After confirming booking:
await notifyBookingConfirmed(bookingId);

// On the client side (after API call):
showToast({
  type: "success",
  title: "Booking Confirmed! 🎉",
  message: `Your appointment for ${serviceName} has been confirmed.`,
  actionLabel: "View Booking",
  actionUrl: `/dashboard/bookings/${bookingId}`,
});
```

### 2. After Service Creation

```typescript
// In service creation form
const handleSubmit = async (data) => {
  try {
    const response = await fetch("/api/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (response.ok) {
      showToast({
        type: "success",
        title: "Service Created!",
        message: "Your service has been created successfully.",
        actionLabel: "View Service",
        actionUrl: "/organiser/services",
      });
    }
  } catch (error) {
    showToast({
      type: "error",
      title: "Creation Failed",
      message: "Unable to create service. Please try again.",
    });
  }
};
```

### 3. After Role Change

```typescript
// In admin user management
const handleRoleChange = async (userId, newRole) => {
  try {
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role: newRole }),
    });

    showToast({
      type: "update",
      title: "Role Updated",
      message: `User role has been changed to ${newRole}.`,
    });
  } catch (error) {
    showToast({
      type: "error",
      title: "Update Failed",
      message: "Unable to update user role.",
    });
  }
};
```

### 4. New Message Notification

```typescript
// When receiving a new message
showToast({
  type: "message",
  title: "New Message from John",
  message: "Hi, I'd like to reschedule my appointment...",
  actionLabel: "Reply",
  actionUrl: "/messages/123",
  duration: 7000, // Show for 7 seconds
});
```

### 5. Booking Reminder

```typescript
// 24 hours before appointment
showToast({
  type: "booking",
  title: "Appointment Reminder",
  message: "You have an appointment tomorrow at 2:00 PM.",
  actionLabel: "View Details",
  actionUrl: "/dashboard/bookings/123",
  duration: 10000, // Show for 10 seconds
});
```

### 6. Payment Confirmation

```typescript
// After successful payment
showToast({
  type: "success",
  title: "Payment Successful",
  message: "₹500 has been charged to your card.",
  actionLabel: "View Receipt",
  actionUrl: "/payments/receipt/123",
});
```

## Server-Side Integration

For server-side events (like webhooks), you can trigger toasts through the notification system:

```typescript
// In /lib/notifications.ts
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  // ... existing code ...

  // Also trigger a toast for real-time feedback
  // This would be sent via WebSocket or Server-Sent Events
  // For now, the toast will appear when the user polls for notifications
}
```

## Styling

The toast notifications use the app's color scheme:
- **Success**: Green (#E8F5E9 background, #2E7D32 border)
- **Error**: Red (#FFEBEE background, #C62828 border)
- **Warning**: Orange (#FFF3E0 background, #E65100 border)
- **Info**: Blue (#E1F5FE background, #0277BD border)
- **Message**: Purple (#F5EDF4 background, #724A6A border)
- **Booking**: Blue (#E1F5FE background, #0277BD border)
- **Update**: Gold (#FFF8E1 background, #D4A017 border)

## Sound Effects

Each toast type plays a different sound:
- **Success**: Ascending tri-tone (C5-E5-G5)
- **Error**: Descending tone (G4-F4)
- **Others**: Standard tri-tone (C6-E6-G6)

Sounds are generated using the Web Audio API, so no external files are needed!

## Best Practices

1. **Keep messages short**: Aim for 1-2 sentences
2. **Use appropriate types**: Match the toast type to the message context
3. **Provide actions when relevant**: Add action buttons for important notifications
4. **Don't spam**: Avoid showing multiple toasts for the same action
5. **Use custom durations wisely**: 
   - Quick feedback: 3 seconds
   - Standard: 5 seconds (default)
   - Important info: 7-10 seconds

## Examples in Different Scenarios

### Form Validation
```typescript
if (!email) {
  showToast({
    type: "warning",
    title: "Email Required",
    message: "Please enter your email address.",
    duration: 3000,
  });
}
```

### Network Error
```typescript
catch (error) {
  showToast({
    type: "error",
    title: "Connection Error",
    message: "Unable to connect to server. Please check your internet.",
  });
}
```

### Feature Announcement
```typescript
showToast({
  type: "info",
  title: "New Feature Available!",
  message: "You can now reschedule appointments directly.",
  actionLabel: "Learn More",
  actionUrl: "/help/rescheduling",
  duration: 8000,
});
```

### Booking Cancellation
```typescript
showToast({
  type: "warning",
  title: "Booking Cancelled",
  message: "Your appointment has been cancelled. Refund will be processed in 3-5 days.",
  actionLabel: "View Refund Status",
  actionUrl: "/payments/refunds",
});
```

## Testing

To test the toast system, you can add a test button anywhere:

```typescript
<button
  onClick={() => {
    showToast({
      type: "success",
      title: "Test Toast",
      message: "This is a test notification!",
    });
  }}
>
  Show Test Toast
</button>
```

## Accessibility

- Toasts are announced to screen readers
- Close buttons are keyboard accessible
- Action links are focusable
- Color contrast meets WCAG AA standards

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Future Enhancements

- [ ] Toast queue management (limit concurrent toasts)
- [ ] Position options (top-left, bottom-right, etc.)
- [ ] Progress bar for duration
- [ ] Pause on hover
- [ ] Swipe to dismiss on mobile
- [ ] Custom icons
- [ ] Rich content (images, buttons)
- [ ] Toast history/log
