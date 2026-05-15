import { useRef, useState } from 'react';

/**
 * Wrapper around the Web Speech API.
 * - continuous = true  → keeps listening until the user stops it
 * - Accumulates final results within a session
 * - Appends to whatever text is already in the box (pass currentInput to toggle)
 * onResult(transcript) is called with the full combined string as the user speaks.
 * Returns { listening, toggle, supported }.
 */
export function useSpeechRecognition(onResult) {
  const [listening, setListening] = useState(false);
  const recRef        = useRef(null);
  const sessionBase   = useRef(''); // input text captured at session start
  const finalAccum    = useRef(''); // final results accumulated this session

  const supported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  function stop() {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }

  function start(currentInput) {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous     = true;
    rec.interimResults = true;
    rec.lang           = 'en-US';

    sessionBase.current = currentInput ?? '';
    finalAccum.current  = '';

    rec.onresult = (e) => {
      let finalPart = '';
      let interim   = '';
      for (const result of Array.from(e.results)) {
        if (result.isFinal) finalPart += result[0].transcript;
        else interim += result[0].transcript;
      }
      finalAccum.current = finalPart;
      const base = sessionBase.current;
      const spoken = (finalPart + interim).trim();
      const combined = base
        ? spoken ? base + ' ' + spoken : base
        : spoken;
      onResult(combined);
    };

    rec.onerror = (e) => {
      // 'no-speech' is not a real error — ignore it so the session stays open
      if (e.error !== 'no-speech') stop();
    };

    rec.onend = () => {
      // Guard: if we're still supposed to be listening (browser killed the
      // session early, e.g. iOS 30-s cap), restart automatically.
      if (recRef.current === rec) {
        try { rec.start(); } catch { stop(); }
      }
    };

    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      recRef.current = null;
    }
  }

  function toggle(currentInput) {
    if (listening) { stop(); return; }
    start(currentInput);
  }

  return { listening, toggle, supported };
}
