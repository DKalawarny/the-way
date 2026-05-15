import { useRef, useState } from 'react';

/**
 * Wraps the Web Speech API with continuous listening and text accumulation.
 *
 * - Keeps mic open until the user explicitly stops it.
 * - On browsers that kill the session early (iOS 30-s cap), auto-spawns a
 *   new recognition instance and preserves all previously spoken text.
 * - New sessions append to whatever is already in the input box (pass
 *   currentInput to toggle() so committed starts from the right place).
 *
 * Returns { listening, toggle, supported }.
 * toggle(currentInput) — starts or stops listening.
 */
export function useSpeechRecognition(onResult) {
  const [listening, setListening]  = useState(false);
  const activeRef   = useRef(false);  // true while we want the mic open
  const recRef      = useRef(null);
  const committed   = useRef('');     // text finalised before the current sub-session
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;     // stay fresh every render, no effect needed

  const supported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  function spawnRec() {
    if (!supported || !activeRef.current) return;

    const SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous     = true;   // Chrome/desktop: stays open; iOS: ignored but we restart
    rec.interimResults = true;
    rec.lang           = 'en-US';

    let latestFinal = ''; // finals seen in this sub-session (cumulative from e.results)

    rec.onresult = (e) => {
      let finalStr = '';
      let interim  = '';
      for (const result of Array.from(e.results)) {
        if (result.isFinal) finalStr += result[0].transcript;
        else interim += result[0].transcript;
      }
      latestFinal = finalStr;

      // Display = pre-session text  +  this session's finals  +  current interim
      const parts = [committed.current, finalStr, interim]
        .map((s) => s.trim())
        .filter(Boolean);
      onResultRef.current(parts.join(' '));
    };

    rec.onerror = (e) => {
      // 'no-speech' just means a pause — keep listening
      if (e.error !== 'no-speech') {
        activeRef.current = false;
        setListening(false);
      }
    };

    rec.onend = () => {
      if (!activeRef.current) return; // user explicitly stopped — don't restart

      // Browser killed the session (iOS 30-s cap or similar).
      // Commit whatever was finalised in this sub-session, then spawn a new one.
      committed.current = [committed.current, latestFinal]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ');
      latestFinal = '';
      setTimeout(spawnRec, 150); // brief gap avoids InvalidStateError on some browsers
    };

    try {
      rec.start();
      recRef.current = rec;
    } catch {
      // start() can throw if the browser blocks mic access
      activeRef.current = false;
      setListening(false);
    }
  }

  function toggle(currentInput) {
    if (activeRef.current) {
      // Stop
      activeRef.current = false;
      recRef.current?.stop();
      recRef.current = null;
      setListening(false);
      return;
    }
    // Start — seed committed with whatever is already typed
    activeRef.current    = true;
    committed.current    = (currentInput ?? '').trimEnd();
    spawnRec();
    setListening(true);
  }

  return { listening, toggle, supported };
}
