'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
}

export function useVoiceRecognition(onFinal: (text: string) => void): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Start as false — resolved after mount to avoid SSR/hydration mismatch
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Detect browser support after mount (client-side only)
  useEffect(() => {
    setIsSupported(
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    );
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setInterimTranscript(interim);
      if (final) {
        setTranscript(final);
        recognitionRef.current._finalText = final;
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      const finalText = recognitionRef.current?._finalText;
      if (finalText) onFinal(finalText);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === 'not-allowed') setError('Microphone permission denied. Please allow microphone access.');
      else if (event.error === 'no-speech') setError('No speech detected. Please try again.');
      else setError(`Voice error: ${event.error}`);
    };

    recognitionRef.current = recognition;
    recognitionRef.current._finalText = '';
    recognition.start();
    setIsListening(true);
  }, [isSupported, onFinal]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, transcript, interimTranscript, isSupported, error, startListening, stopListening };
}
