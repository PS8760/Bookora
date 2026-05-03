/**
 * Notification Sound Generator
 * Creates an iOS-style tri-tone notification sound using Web Audio API
 */

let audioContext: AudioContext | null = null;
let audioInitialized = false;

/**
 * Initialize audio context (must be called after user interaction)
 */
export function initAudioContext() {
  if (!audioContext && typeof window !== "undefined") {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioInitialized = true;
      console.log("🔊 Audio context initialized successfully");
    } catch (error) {
      console.error("Failed to initialize audio context:", error);
    }
  }
  return audioContext;
}

/**
 * Check if audio is initialized
 */
export function isAudioInitialized() {
  return audioInitialized;
}

/**
 * Auto-initialize audio on first user interaction (if not already initialized)
 */
if (typeof window !== "undefined") {
  const autoInit = () => {
    if (!audioInitialized) {
      initAudioContext();
      // Remove listeners after first initialization
      document.removeEventListener("click", autoInit);
      document.removeEventListener("keydown", autoInit);
      document.removeEventListener("touchstart", autoInit);
    }
  };

  document.addEventListener("click", autoInit, { once: true });
  document.addEventListener("keydown", autoInit, { once: true });
  document.addEventListener("touchstart", autoInit, { once: true });
}

/**
 * Play iOS-style tri-tone notification sound
 * Frequencies: C6 (1046.5 Hz), E6 (1318.5 Hz), G6 (1568 Hz)
 */
export function playNotificationSound() {
  const ctx = audioContext || initAudioContext();
  if (!ctx) {
    console.warn("Audio context not available");
    return;
  }

  try {
    const now = ctx.currentTime;
    
    // Create three tones (C-E-G chord)
    const frequencies = [1046.5, 1318.5, 1568]; // C6, E6, G6
    const duration = 0.15; // Each tone duration
    const gap = 0.05; // Gap between tones
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Use sine wave for smooth sound
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      
      // Envelope: quick attack, sustain, quick release
      const startTime = now + (index * (duration + gap));
      const endTime = startTime + duration;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01); // Quick attack
      gainNode.gain.setValueAtTime(0.3, endTime - 0.05); // Sustain
      gainNode.gain.linearRampToValueAtTime(0, endTime); // Quick release
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  } catch (error) {
    console.error("Failed to play notification sound:", error);
  }
}

/**
 * Play a simple beep sound (fallback)
 */
export function playSimpleBeep() {
  const ctx = audioContext || initAudioContext();
  if (!ctx) {
    console.warn("Audio context not available");
    return;
  }

  try {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = "sine";
    oscillator.frequency.value = 800; // 800 Hz
    
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
    
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  } catch (error) {
    console.error("Failed to play beep sound:", error);
  }
}

/**
 * Play a success sound (higher pitched)
 */
export function playSuccessSound() {
  const ctx = audioContext || initAudioContext();
  if (!ctx) {
    console.warn("Audio context not available");
    return;
  }

  try {
    const now = ctx.currentTime;
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
    const duration = 0.12;
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      
      const startTime = now + (index * 0.08);
      const endTime = startTime + duration;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, endTime);
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  } catch (error) {
    console.error("Failed to play success sound:", error);
  }
}

/**
 * Play an error sound (lower pitched)
 */
export function playErrorSound() {
  const ctx = audioContext || initAudioContext();
  if (!ctx) {
    console.warn("Audio context not available");
    return;
  }

  try {
    const now = ctx.currentTime;
    const frequencies = [392, 349.23]; // G4, F4 (descending)
    const duration = 0.2;
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      
      const startTime = now + (index * 0.15);
      const endTime = startTime + duration;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, endTime);
      
      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  } catch (error) {
    console.error("Failed to play error sound:", error);
  }
}
