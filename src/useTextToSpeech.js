import { useState, useRef, useEffect } from 'react';
import { authedFetch } from './supabase.js';

/**
 * High-quality TTS via /api/tts (OpenAI tts-1).
 * Streams audio so playback starts on the first chunk — minimal delay.
 * Falls back to Web Speech API if the endpoint is unavailable.
 *
 * useTextToSpeech({ voice: 'onyx' })
 * speak(id, text) — tap same id again to stop.
 */
// Light client-side shaping — gpt-4o-mini-tts handles expressiveness;
// we only add gentle EQ touches for warmth and clarity.
const VOICE_SHAPE = {
  onyx: {
    playbackRate: 1.0,
    bassFreq: 150,
    bassGain: 2,          // just enough warmth to feel full
    presenceFreq: 2200,
    presenceGain: 1.5,    // slight mid-range lift for vocal clarity
  },
  nova: {
    playbackRate: 1.0,
    bassFreq: 220,
    bassGain: 1.5,        // gentle warmth, nothing heavy
    presenceFreq: 4500,
    presenceGain: -2,     // soften the high end for a hushed, gentle feel
  },
  shimmer: {
    playbackRate: 1.0,
    bassFreq: 220,
    bassGain: 1.5,
    presenceFreq: 4500,
    presenceGain: -2,
  },
};

export function useTextToSpeech({ voice = 'onyx' } = {}) {
  const [speakingId, setSpeakingId] = useState(null);
  const audioRef    = useRef(null);
  const msRef       = useRef(null);   // MediaSource
  const blobUrl     = useRef(null);
  const abortRef    = useRef(null);
  const audioCtxRef = useRef(null);   // reuse AudioContext across calls

  const supported = true;

  // ── cleanup ────────────────────────────────────────────────────────────────

  function cancelFetch() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (msRef.current) {
      try { if (msRef.current.readyState === 'open') msRef.current.endOfStream(); } catch {}
      msRef.current = null;
    }
    if (blobUrl.current) {
      URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = null;
    }
  }

  function stop() {
    cancelFetch();
    stopAudio();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }

  useEffect(() => {
    window.addEventListener('beforeunload', stop);
    return () => { stop(); window.removeEventListener('beforeunload', stop); };
  }, []);

  // Apply pitch / EQ shaping via Web Audio API
  function shapeAudio(audio) {
    const shape = VOICE_SHAPE[voice] ?? VOICE_SHAPE.onyx;
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      const ctx    = audioCtxRef.current;
      const source = ctx.createMediaElementSource(audio);

      // Bass boost — warms up and deepens the voice
      const bass = ctx.createBiquadFilter();
      bass.type            = 'lowshelf';
      bass.frequency.value = shape.bassFreq;
      bass.gain.value      = shape.bassGain;

      // Presence shelf — tame harshness or add clarity
      const presence = ctx.createBiquadFilter();
      presence.type            = 'highshelf';
      presence.frequency.value = shape.presenceFreq;
      presence.gain.value      = shape.presenceGain;

      source.connect(bass);
      bass.connect(presence);
      presence.connect(ctx.destination);

      if (ctx.state === 'suspended') ctx.resume();
    } catch {}

    // Slightly lower playback rate deepens pitch naturally
    audio.playbackRate = shape.playbackRate;
  }

  // ── speak ──────────────────────────────────────────────────────────────────

  async function speak(id, text) {
    if (speakingId === id) { stop(); return; }
    stop();
    setSpeakingId(id);
    abortRef.current = new AbortController();

    try {
      const res = await authedFetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error('tts error');
      if (!abortRef.current) return; // was stopped while fetching

      // Stream into MediaSource so playback starts on the first chunk
      if (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg')) {
        const ms  = new MediaSource();
        msRef.current = ms;
        const url = URL.createObjectURL(ms);
        blobUrl.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        shapeAudio(audio);
        audio.onended = () => { stopAudio(); setSpeakingId(null); };
        audio.onerror = () => { stopAudio(); setSpeakingId(null); };

        ms.addEventListener('sourceopen', async () => {
          let sb;
          try { sb = ms.addSourceBuffer('audio/mpeg'); } catch { return; }

          const reader = res.body.getReader();
          const pump   = async () => {
            const { done, value } = await reader.read();
            if (done) {
              try { if (ms.readyState === 'open') ms.endOfStream(); } catch {}
              return;
            }
            // Wait for previous append to finish before sending next chunk
            const waitUpdate = () => new Promise((r) =>
              sb.updating ? sb.addEventListener('updateend', r, { once: true }) : r()
            );
            await waitUpdate();
            if (!audioRef.current) return; // stopped mid-stream
            try { sb.appendBuffer(value); } catch {}
            sb.addEventListener('updateend', pump, { once: true });
          };
          pump();
        });

        await audio.play();
      } else {
        // Safari fallback — blob approach
        const blob = await res.blob();
        if (!abortRef.current) return;
        const url = URL.createObjectURL(blob);
        blobUrl.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        shapeAudio(audio);
        audio.onended = () => { stopAudio(); setSpeakingId(null); };
        audio.onerror = () => { stopAudio(); setSpeakingId(null); };
        await audio.play();
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
      console.warn('[tts] falling back to Web Speech:', e?.message);
      stopAudio();
      fallbackSpeak(id, text);
    }
  }

  // ── Web Speech fallback ────────────────────────────────────────────────────

  const resumeTimer = useRef(null);
  function clearTimer() {
    if (resumeTimer.current) { clearInterval(resumeTimer.current); resumeTimer.current = null; }
  }

  function pickVoice() {
    const voices = window.speechSynthesis.getVoices();
    const en = voices.filter((v) => v.lang.startsWith('en'));
    if (!en.length) return null;
    const wantMale = voice === 'onyx';
    if (wantMale) {
      // Prefer natural-sounding male voices — iOS: Aaron, Eddy, Daniel, Gordon, James, Tom; Android: Google UK English Male
      return (
        en.find((v) => /\b(aaron|eddy|daniel|gordon|james|tom|rishi)\b/i.test(v.name)) ||
        en.find((v) => /male/i.test(v.name)) ||
        en.find((v) => /google.*english/i.test(v.name) && /uk|en-gb/i.test(v.name + v.lang)) ||
        en.find((v) => /enhanced|premium/i.test(v.name) && !/samantha|karen|moira|victoria|tessa|fiona/i.test(v.name)) ||
        en[0]
      );
    }
    // Female — prefer enhanced/premium, then named female voices
    return (
      en.find((v) => /enhanced|premium|neural/i.test(v.name)) ||
      en.find((v) => /google/i.test(v.name) && v.lang === 'en-US') ||
      en.find((v) => /^(samantha|karen|moira|victoria|tessa|fiona)/i.test(v.name)) ||
      en.find((v) => v.lang === 'en-US') ||
      en[0]
    );
  }

  function fallbackSpeak(id, text) {
    if (!('speechSynthesis' in window)) { setSpeakingId(null); return; }
    window.speechSynthesis.cancel();
    clearTimer();
    const cleaned = text
      .replace(/──[^\n]*──/g, '.').replace(/──/g, '')
      .replace(/\*\*/g, '').replace(/\*/g, '').replace(/_{1,2}/g, '')
      .replace(/—/g, ', ').replace(/…/g, '.')
      .replace(/\n{2,}/g, '. ').replace(/\n/g, ' ')
      .replace(/\s+/g, ' ').trim();
    const utt = new SpeechSynthesisUtterance(cleaned);
    utt.rate = 1.0; utt.pitch = 1.0;
    const assign = () => { const v = pickVoice(); if (v) utt.voice = v; };
    window.speechSynthesis.getVoices().length
      ? assign()
      : (window.speechSynthesis.onvoiceschanged = () => { assign(); window.speechSynthesis.onvoiceschanged = null; });
    utt.onstart = () => {
      resumeTimer.current = setInterval(() => {
        if (window.speechSynthesis.speaking) { window.speechSynthesis.pause(); window.speechSynthesis.resume(); }
        else clearTimer();
      }, 10000);
    };
    utt.onend   = () => { clearTimer(); setSpeakingId(null); };
    utt.onerror = () => { clearTimer(); setSpeakingId(null); };
    window.speechSynthesis.speak(utt);
  }

  return { speakingId, speak, stop, supported };
}
