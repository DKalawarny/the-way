import { useRef, useState } from 'react';

/**
 * Thin wrapper around the Web Speech API.
 * onResult(transcript) is called with interim + final results as the user speaks.
 * Returns { listening, toggle, supported }.
 */
export function useSpeechRecognition(onResult) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  const supported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  function toggle() {
    if (!supported) return;

    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      onResult(transcript);
    };

    rec.onend  = () => setListening(false);
    rec.onerror = () => setListening(false);

    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  return { listening, toggle, supported };
}
