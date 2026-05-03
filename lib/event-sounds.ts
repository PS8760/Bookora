/**
 * Event-Based Sound System
 * Plays sounds when specific events are triggered
 */

import { 
  playNotificationSound, 
  playSuccessSound, 
  playErrorSound,
  initAudioContext 
} from "./notification-sound";

// ─── Event Types ──────────────────────────────────────────────────────────────

export type SoundEvent = 
  | "booking_confirmed"
  | "booking_pending"
  | "booking_cancelled"
  | "payment_received"
  | "payment_failed"
  | "refund_processed"
  | "service_published"
  | "role_changed"
  | "message_received"
  | "notification_received"
  | "error"
  | "success"
  | "warning";

// ─── Sound Mapping ────────────────────────────────────────────────────────────

const soundMap: Record<SoundEvent, () => void> = {
  // Success events - ascending tones
  booking_confirmed: playSuccessSound,
  payment_received: playSuccessSound,
  service_published: playSuccessSound,
  success: playSuccessSound,

  // Error events - descending tones
  booking_cancelled: playErrorSound,
  payment_failed: playErrorSound,
  error: playErrorSound,

  // Notification events - tri-tone
  booking_pending: playNotificationSound,
  refund_processed: playNotificationSound,
  role_changed: playNotificationSound,
  message_received: playNotificationSound,
  notification_received: playNotificationSound,
  warning: playNotificationSound,
};

// ─── Core Functions ───────────────────────────────────────────────────────────

/**
 * Play sound for a specific event
 */
export function playEventSound(event: SoundEvent): void {
  try {
    // Ensure audio context is initialized
    initAudioContext();
    
    // Get the sound function for this event
    const soundFn = soundMap[event];
    
    if (soundFn) {
      soundFn();
      console.log(`🔊 Playing sound for event: ${event}`);
    } else {
      console.warn(`No sound mapped for event: ${event}`);
    }
  } catch (error) {
    console.error("Failed to play event sound:", error);
  }
}

/**
 * Trigger a custom event that plays a sound
 * This can be called from anywhere in the app
 */
export function triggerSoundEvent(event: SoundEvent, data?: any): void {
  // Play the sound
  playEventSound(event);
  
  // Dispatch custom event for other components to listen to
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("sound-event", {
        detail: { event, data, timestamp: new Date() },
      })
    );
  }
}

/**
 * Listen to sound events
 */
export function onSoundEvent(
  callback: (event: SoundEvent, data?: any) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent;
    callback(customEvent.detail.event, customEvent.detail.data);
  };

  window.addEventListener("sound-event", handler);

  // Return cleanup function
  return () => {
    window.removeEventListener("sound-event", handler);
  };
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Play sound based on notification type
 */
export function playNotificationTypeSound(
  type: "success" | "error" | "warning" | "info" | "message" | "booking" | "update"
): void {
  switch (type) {
    case "success":
      playEventSound("success");
      break;
    case "error":
      playEventSound("error");
      break;
    case "warning":
      playEventSound("warning");
      break;
    case "message":
      playEventSound("message_received");
      break;
    case "booking":
      playEventSound("booking_confirmed");
      break;
    default:
      playEventSound("notification_received");
  }
}

/**
 * Play sound for booking status change
 */
export function playBookingStatusSound(
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED"
): void {
  switch (status) {
    case "CONFIRMED":
    case "COMPLETED":
      playEventSound("booking_confirmed");
      break;
    case "CANCELLED":
      playEventSound("booking_cancelled");
      break;
    case "PENDING":
      playEventSound("booking_pending");
      break;
  }
}

/**
 * Play sound for payment status change
 */
export function playPaymentStatusSound(
  status: "PAID" | "FAILED" | "REFUNDED" | "PENDING"
): void {
  switch (status) {
    case "PAID":
      playEventSound("payment_received");
      break;
    case "FAILED":
      playEventSound("payment_failed");
      break;
    case "REFUNDED":
      playEventSound("refund_processed");
      break;
    case "PENDING":
      playEventSound("notification_received");
      break;
  }
}

// ─── Auto-Initialize ──────────────────────────────────────────────────────────

if (typeof window !== "undefined") {
  // Auto-initialize audio context on first user interaction
  const autoInit = () => {
    initAudioContext();
    document.removeEventListener("click", autoInit);
    document.removeEventListener("keydown", autoInit);
    document.removeEventListener("touchstart", autoInit);
  };

  document.addEventListener("click", autoInit, { once: true });
  document.addEventListener("keydown", autoInit, { once: true });
  document.addEventListener("touchstart", autoInit, { once: true });
}
