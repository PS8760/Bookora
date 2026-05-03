# 🔊 Event Sounds - Quick Reference

## ✅ Ready to Use!

Sounds play automatically when events are triggered!

---

## 🎯 Quick Usage

### In React Components:

```typescript
import { useBookingSound } from "@/hooks/useEventSound";

function MyComponent() {
  const { playConfirmed } = useBookingSound();
  
  const handleClick = () => {
    playConfirmed(); // Play sound!
  };
  
  return <button onClick={handleClick}>Confirm</button>;
}
```

---

## 🎵 Available Hooks

### Booking Sounds:
```typescript
import { useBookingSound } from "@/hooks/useEventSound";

const { 
  playConfirmed,  // ✅ Success sound
  playPending,    // 🔔 Notification sound
  playCancelled   // ❌ Error sound
} = useBookingSound();
```

### Payment Sounds:
```typescript
import { usePaymentSound } from "@/hooks/useEventSound";

const { 
  playReceived,  // ✅ Success sound
  playFailed,    // ❌ Error sound
  playRefunded   // 🔔 Notification sound
} = usePaymentSound();
```

### General Sounds:
```typescript
import { useNotificationSound } from "@/hooks/useEventSound";

const { 
  playSuccess,       // ✅ Success sound
  playError,         // ❌ Error sound
  playWarning,       // ⚠️ Warning sound
  playMessage,       // 💬 Message sound
  playNotification   // 🔔 Notification sound
} = useNotificationSound();
```

---

## 🎯 Common Use Cases

### 1. Booking Confirmation:
```typescript
const { playConfirmed } = useBookingSound();

await confirmBooking(id);
playConfirmed();
```

### 2. Payment Success:
```typescript
const { playReceived } = usePaymentSound();

await processPayment();
playReceived();
```

### 3. Show Error:
```typescript
const { playError } = useNotificationSound();

try {
  await doSomething();
} catch (error) {
  playError();
}
```

### 4. New Message:
```typescript
const { playMessage } = useNotificationSound();

onNewMessage(() => {
  playMessage();
});
```

---

## 📊 Sound Types

| Hook Method | Sound | When to Use |
|------------|-------|-------------|
| `playConfirmed()` | ✅ Ascending | Booking confirmed |
| `playReceived()` | ✅ Ascending | Payment received |
| `playSuccess()` | ✅ Ascending | General success |
| `playCancelled()` | ❌ Descending | Booking cancelled |
| `playFailed()` | ❌ Descending | Payment failed |
| `playError()` | ❌ Descending | General error |
| `playPending()` | 🔔 Tri-tone | Booking pending |
| `playRefunded()` | 🔔 Tri-tone | Refund processed |
| `playMessage()` | 🔔 Tri-tone | New message |
| `playWarning()` | 🔔 Tri-tone | Warning |
| `playNotification()` | 🔔 Tri-tone | General notification |

---

## 🧪 Quick Test

```typescript
import { useEventSound } from "@/hooks/useEventSound";

function TestButton() {
  const { playSound } = useEventSound();
  
  return (
    <button onClick={() => playSound("booking_confirmed")}>
      Test Sound
    </button>
  );
}
```

---

## 📚 Full Documentation

See `EVENT_SOUNDS_GUIDE.md` for:
- Complete API reference
- Advanced usage examples
- Custom event creation
- Integration examples

---

## ✅ Summary

**Sounds are ready to use!**

```typescript
// Import hook
import { useBookingSound } from "@/hooks/useEventSound";

// Use in component
const { playConfirmed } = useBookingSound();

// Play sound
playConfirmed();
```

**That's it!** 🔊✨
