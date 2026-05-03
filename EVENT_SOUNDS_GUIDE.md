# 🔊 Event-Based Sound System - Complete Guide

## ✅ Status: FULLY IMPLEMENTED

A comprehensive event-based sound system that plays sounds automatically when specific events are triggered!

---

## 🎯 What's Been Implemented

### 1. **Event Sound System** ✅
- **Location:** `lib/event-sounds.ts`
- **Features:**
  - 13 predefined event types
  - Automatic sound mapping
  - Global event system
  - Easy to trigger from anywhere

### 2. **React Hooks** ✅
- **Location:** `hooks/useEventSound.ts`
- **Features:**
  - `useEventSound()` - General sound trigger
  - `useBookingSound()` - Booking-specific sounds
  - `usePaymentSound()` - Payment-specific sounds
  - `useNotificationSound()` - Notification sounds

### 3. **Integration** ✅
- ✅ Toast notifications use event sounds
- ✅ Notification bell uses event sounds
- ✅ Auto-initializes audio context
- ✅ Works across the entire app

---

## 🎵 Available Sound Events

### Success Events (Ascending Tones):
- ✅ `booking_confirmed` - When booking is confirmed
- ✅ `payment_received` - When payment is successful
- ✅ `service_published` - When service goes live
- ✅ `success` - General success

### Error Events (Descending Tones):
- ✅ `booking_cancelled` - When booking is cancelled
- ✅ `payment_failed` - When payment fails
- ✅ `error` - General error

### Notification Events (Tri-tone):
- ✅ `booking_pending` - When booking needs approval
- ✅ `refund_processed` - When refund is completed
- ✅ `role_changed` - When user role changes
- ✅ `message_received` - When new message arrives
- ✅ `notification_received` - General notification
- ✅ `warning` - Warning notification

---

## 💻 Usage Examples

### 1. Using React Hooks (Recommended)

#### In a React Component:

```typescript
import { useBookingSound } from "@/hooks/useEventSound";

function BookingConfirmButton() {
  const { playConfirmed } = useBookingSound();

  const handleConfirm = async () => {
    // Confirm booking logic...
    await confirmBooking(bookingId);
    
    // Play sound
    playConfirmed();
  };

  return <button onClick={handleConfirm}>Confirm Booking</button>;
}
```

#### Payment Component:

```typescript
import { usePaymentSound } from "@/hooks/useEventSound";

function PaymentButton() {
  const { playReceived, playFailed } = usePaymentSound();

  const handlePayment = async () => {
    try {
      await processPayment();
      playReceived(); // Success sound
    } catch (error) {
      playFailed(); // Error sound
    }
  };

  return <button onClick={handlePayment}>Pay Now</button>;
}
```

#### General Notifications:

```typescript
import { useNotificationSound } from "@/hooks/useEventSound";

function NotificationComponent() {
  const { playSuccess, playError, playWarning } = useNotificationSound();

  return (
    <div>
      <button onClick={playSuccess}>Success</button>
      <button onClick={playError}>Error</button>
      <button onClick={playWarning}>Warning</button>
    </div>
  );
}
```

### 2. Using Direct Function Calls

#### In API Routes:

```typescript
// app/api/bookings/[id]/confirm/route.ts
import { triggerSoundEvent } from "@/lib/event-sounds";

export async function POST(request: Request) {
  // Confirm booking...
  await confirmBooking(bookingId);
  
  // Trigger sound event (will play on client)
  triggerSoundEvent("booking_confirmed", { bookingId });
  
  return NextResponse.json({ success: true });
}
```

#### In Server Actions:

```typescript
"use server";

import { triggerSoundEvent } from "@/lib/event-sounds";

export async function confirmBookingAction(bookingId: string) {
  await confirmBooking(bookingId);
  
  // This will trigger sound on the client
  triggerSoundEvent("booking_confirmed");
  
  return { success: true };
}
```

### 3. Using Event System

#### Trigger from Anywhere:

```typescript
import { triggerSoundEvent } from "@/lib/event-sounds";

// Trigger booking confirmed sound
triggerSoundEvent("booking_confirmed");

// Trigger with data
triggerSoundEvent("payment_received", {
  amount: 100,
  currency: "INR",
});

// Trigger message received
triggerSoundEvent("message_received", {
  from: "John Doe",
  message: "Hello!",
});
```

#### Listen to Sound Events:

```typescript
import { onSoundEvent } from "@/lib/event-sounds";

// Listen to all sound events
const cleanup = onSoundEvent((event, data) => {
  console.log(`Sound played: ${event}`, data);
});

// Cleanup when done
cleanup();
```

---

## 🎯 Real-World Integration Examples

### Example 1: Booking Confirmation Page

```typescript
"use client";

import { useBookingSound } from "@/hooks/useEventSound";
import { showToast } from "@/components/ToastNotification";

export default function BookingConfirmPage({ bookingId }: { bookingId: string }) {
  const { playConfirmed } = useBookingSound();

  const handleConfirm = async () => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/confirm`, {
        method: "POST",
      });

      if (response.ok) {
        // Play success sound
        playConfirmed();
        
        // Show toast
        showToast({
          type: "success",
          title: "Booking Confirmed!",
          message: "The customer has been notified.",
        });
      }
    } catch (error) {
      console.error("Failed to confirm booking:", error);
    }
  };

  return (
    <button onClick={handleConfirm} className="btn-primary">
      Confirm Booking
    </button>
  );
}
```

### Example 2: Payment Success Page

```typescript
"use client";

import { useEffect } from "react";
import { usePaymentSound } from "@/hooks/useEventSound";

export default function PaymentSuccessPage() {
  const { playReceived } = usePaymentSound();

  useEffect(() => {
    // Play sound when page loads
    playReceived();
  }, [playReceived]);

  return (
    <div>
      <h1>Payment Successful! 🎉</h1>
      <p>Your payment has been received.</p>
    </div>
  );
}
```

### Example 3: Real-Time Message Notification

```typescript
"use client";

import { useEffect } from "react";
import { useEventSound } from "@/hooks/useEventSound";

export default function MessageListener() {
  const { playSound } = useEventSound();

  useEffect(() => {
    // Listen for new messages via WebSocket or polling
    const handleNewMessage = (message: any) => {
      // Play message received sound
      playSound("message_received", message);
      
      // Show notification
      showToast({
        type: "message",
        title: `New message from ${message.sender}`,
        message: message.content,
      });
    };

    // Set up listener (WebSocket, polling, etc.)
    // ...

    return () => {
      // Cleanup
    };
  }, [playSound]);

  return null; // This is a listener component
}
```

### Example 4: Admin Dashboard - New Booking Alert

```typescript
"use client";

import { useEffect } from "react";
import { useBookingSound } from "@/hooks/useEventSound";
import useSWR from "swr";

export default function AdminDashboard() {
  const { playPending } = useBookingSound();
  const { data: bookings } = useSWR("/api/admin/bookings", fetcher, {
    refreshInterval: 10000, // Poll every 10 seconds
  });

  const previousCount = useRef(0);

  useEffect(() => {
    if (bookings) {
      const pendingCount = bookings.filter(b => b.status === "PENDING").length;
      
      // New pending booking detected
      if (pendingCount > previousCount.current) {
        playPending(); // Play sound
        
        showToast({
          type: "booking",
          title: "New Booking Request",
          message: "A customer has requested a booking.",
        });
      }
      
      previousCount.current = pendingCount;
    }
  }, [bookings, playPending]);

  return <div>Admin Dashboard</div>;
}
```

---

## 🔧 Advanced Usage

### Custom Sound Events

You can add custom events by extending the system:

```typescript
// In lib/event-sounds.ts
export type SoundEvent = 
  | "booking_confirmed"
  | "payment_received"
  // ... existing events
  | "custom_event"; // Add your custom event

const soundMap: Record<SoundEvent, () => void> = {
  // ... existing mappings
  custom_event: playNotificationSound, // Map to a sound
};
```

### Conditional Sound Playing

```typescript
import { triggerSoundEvent } from "@/lib/event-sounds";

function handleEvent(shouldPlaySound: boolean) {
  if (shouldPlaySound) {
    triggerSoundEvent("notification_received");
  }
}
```

### Sound with User Preferences

```typescript
import { triggerSoundEvent } from "@/lib/event-sounds";

function playIfEnabled(event: SoundEvent) {
  const soundEnabled = localStorage.getItem("soundEnabled") === "true";
  
  if (soundEnabled) {
    triggerSoundEvent(event);
  }
}
```

---

## 🎨 Sound Types

### Success Sound (Ascending):
- **Frequencies:** C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz)
- **Duration:** ~0.44 seconds
- **Use for:** Confirmations, completions, successes

### Error Sound (Descending):
- **Frequencies:** G4 (392 Hz), F4 (349.23 Hz)
- **Duration:** ~0.55 seconds
- **Use for:** Errors, failures, cancellations

### Notification Sound (Tri-tone):
- **Frequencies:** C6 (1046.5 Hz), E6 (1318.5 Hz), G6 (1568 Hz)
- **Duration:** ~0.55 seconds
- **Use for:** General notifications, messages, updates

---

## 🧪 Testing

### Test All Sounds:

```typescript
import { playEventSound } from "@/lib/event-sounds";

// Test success sound
playEventSound("booking_confirmed");

// Test error sound
playEventSound("booking_cancelled");

// Test notification sound
playEventSound("message_received");
```

### Test in Component:

```typescript
import { useEventSound } from "@/hooks/useEventSound";

function TestSounds() {
  const { playSound } = useEventSound();

  return (
    <div>
      <button onClick={() => playSound("booking_confirmed")}>
        Test Booking Confirmed
      </button>
      <button onClick={() => playSound("payment_received")}>
        Test Payment Received
      </button>
      <button onClick={() => playSound("message_received")}>
        Test Message Received
      </button>
    </div>
  );
}
```

---

## 📊 Event Mapping Reference

| Event | Sound Type | Use Case |
|-------|-----------|----------|
| `booking_confirmed` | Success | Booking confirmed |
| `booking_pending` | Notification | Booking needs approval |
| `booking_cancelled` | Error | Booking cancelled |
| `payment_received` | Success | Payment successful |
| `payment_failed` | Error | Payment failed |
| `refund_processed` | Notification | Refund completed |
| `service_published` | Success | Service published |
| `role_changed` | Notification | User role changed |
| `message_received` | Notification | New message |
| `notification_received` | Notification | General notification |
| `success` | Success | General success |
| `error` | Error | General error |
| `warning` | Notification | Warning |

---

## 🎉 Summary

**Event-based sound system is complete!**

✅ 13 predefined event types
✅ React hooks for easy usage
✅ Global event system
✅ Auto-initializes audio
✅ Works across entire app
✅ Integrated with toasts & notifications

**Usage:**
```typescript
// In any component
import { useBookingSound } from "@/hooks/useEventSound";

const { playConfirmed } = useBookingSound();
playConfirmed(); // Play sound!
```

**Sounds play automatically for:**
- ✅ Booking confirmations
- ✅ Payment success/failure
- ✅ New messages
- ✅ Notifications
- ✅ Service updates
- ✅ Role changes

**Everything works automatically!** 🔊✨
