/**
 * React Hook for Event Sounds
 * Easy way to trigger sounds from React components
 */

import { useCallback, useEffect } from "react";
import { 
  triggerSoundEvent, 
  onSoundEvent, 
  playEventSound,
  type SoundEvent 
} from "@/lib/event-sounds";

/**
 * Hook to trigger sound events
 */
export function useEventSound() {
  const playSound = useCallback((event: SoundEvent, data?: any) => {
    triggerSoundEvent(event, data);
  }, []);

  return { playSound };
}

/**
 * Hook to listen to sound events
 */
export function useSoundEventListener(
  callback: (event: SoundEvent, data?: any) => void
) {
  useEffect(() => {
    const cleanup = onSoundEvent(callback);
    return cleanup;
  }, [callback]);
}

/**
 * Hook for booking-related sounds
 */
export function useBookingSound() {
  const { playSound } = useEventSound();

  return {
    playConfirmed: () => playSound("booking_confirmed"),
    playPending: () => playSound("booking_pending"),
    playCancelled: () => playSound("booking_cancelled"),
  };
}

/**
 * Hook for payment-related sounds
 */
export function usePaymentSound() {
  const { playSound } = useEventSound();

  return {
    playReceived: () => playSound("payment_received"),
    playFailed: () => playSound("payment_failed"),
    playRefunded: () => playSound("refund_processed"),
  };
}

/**
 * Hook for general notification sounds
 */
export function useNotificationSound() {
  const { playSound } = useEventSound();

  return {
    playSuccess: () => playSound("success"),
    playError: () => playSound("error"),
    playWarning: () => playSound("warning"),
    playMessage: () => playSound("message_received"),
    playNotification: () => playSound("notification_received"),
  };
}
