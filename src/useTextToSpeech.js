import { useState, useRef, useEffect } from 'react';
import { authedFetch } from './supabase.js';

/**
 * High-quality TTS via /api/tts (OpenAI tts-1).
 *
 * Desktop/Android: streams audio via MediaSource — playback starts on first chunk.
 * iOS: fetches full buffer, decodes via Web Audio API (ctx.decodeAudioData).
 *   AudioContext is unlocked synchronously during the tap gesture, so playback
 *   works even after async fetch/decode — same OpenAI voice as desktop.
 * Fallback: Web Speech API if the endpoint is unavailable.
 */
const VOICE_SHAPE = {
  onyx:    { playbackRate: 1.0 },
  nova:    { playbackRate: 1.0 },
  shimmer: { playbackRate: 1.0 },
};

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

export function useTextToSpeech({ voice = 'onyx' } = {}) {
  const [speakingId, setSpeakingId] = useState(null);
  const [paused, setPaused]         = useState(false);
  const [loadingId, setLoadingId]   = useState(null);
  // audioRef holds either an HTMLAudioElement (desktop) or a Web Audio adapter (iOS)
  const audioRef    = useRef(null);
  const msRef       = useRef(null);   // MediaSource — desktop streaming only
  const blobUrl     = useRef(null);
  const abortRef    = useRef(null);
  const audioCtxRef = useRef(null);   // shared AudioContext

  const supported = true;

  // ── cleanup ────────────────────────────────────────────────────────────────

  function cancelFetch() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  }

  function stopAudio() {
    if (audioRef.current) {
      if (audioRef.current._isWebAudio) {
        // Web Audio BufferSource adapter (iOS)
        audioRef.current._node.onended = null;
        try { audioRef.current._node.stop(); } catch {}
        try { audioRef.current._node.disconnect(); } catch {}
      } else {
        // HTMLAudioElement (desktop)
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
      }
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
    setPaused(false);
    setLoadingId(null);
  }

  function pause() {
    if (audioRef.current) {
      if (audioRef.current._isWebAudio) {
        audioCtxRef.current?.suspend().catch(() => {});
        setPaused(true);
      } else if (!audioRef.current.paused) {
        audioRef.current.pause();
        setPaused(true);
      }
    } else if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  }

  function resume() {
    if (audioRef.current) {
      if (audioRef.current._isWebAudio) {
        audioCtxRef.current?.resume().catch(() => {});
        setPaused(false);
      } else if (audioRef.current.paused) {
        audioCtxRef.current?.resume();
        audioRef.current.play().catch(() => {});
        setPaused(false);
      }
    } else if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    }
  }

  function rewind(seconds = 10) {
    if (audioRef.current) {
      if (audioRef.current._isWebAudio) {
        audioRef.current.rewindTo(Math.max(0, audioRef.current.currentTime - seconds));
      } else {
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
      }
    }
  }

  function forward(seconds = 10) {
    if (audioRef.current) {
      if (audioRef.current._isWebAudio) {
        const dur = audioRef.current._node.buffer?.duration ?? Infinity;
        audioRef.current.rewindTo(Math.min(dur - 0.1, audioRef.current.currentTime + seconds));
      } else {
        const dur = isFinite(audioRef.current.duration) ? audioRef.current.duration : Infinity;
        audioRef.current.currentTime = Math.min(dur, audioRef.current.currentTime + seconds);
      }
    }
  }

  useEffect(() => {
    window.addEventListener('beforeunload', stop);
    return () => { stop(); window.removeEventListener('beforeunload', stop); };
  }, []);

  // ── AudioContext unlock ────────────────────────────────────────────────────
  // Must be called SYNCHRONOUSLY in the user-gesture handler (before any await).
  // Once the context is created + a silent buffer played, it stays unlocked
  // for subsequent async playback — even on iOS.

  function unlockAudioCtx() {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume(); // intentionally not awaited
      }
      // Play a 1-frame silent buffer to fully activate
      const buf = audioCtxRef.current.createBuffer(1, 1, audioCtxRef.current.sampleRate);
      const src = audioCtxRef.current.createBufferSource();
      src.buffer = buf;
      src.connect(audioCtxRef.current.destination);
      src.start(0);
    } catch {}
  }

  // ── Desktop: shape HTML Audio through Web Audio ────────────────────────────

  function shapeAudio(audio) {
    try {
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const source = ctx.createMediaElementSource(audio);
      source.connect(ctx.destination);
      if (ctx.state === 'suspended') ctx.resume();
    } catch {}
    audio.playbackRate = VOICE_SHAPE[voice]?.playbackRate ?? 1.0;
  }

  // ── iOS: fetch TTS → decode → play via Web Audio BufferSource ─────────────

  async function iosFetch(signal) {
    const res = await authedFetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: iosFetch._text, voice }),
      signal,
    });
    if (!res.ok) throw new Error('tts error');
    return res;
  }

  async function iosSpeak(id, text, signal) {
    const res = await authedFetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
      signal,
    });
    if (!res.ok) throw new Error('tts error');
    if (!abortRef.current) return;

    const arrayBuffer = await res.arrayBuffer();
    if (!abortRef.current) return;

    const ctx = audioCtxRef.current;
    // Resume context if it suspended during the async fetch
    if (ctx.state === 'suspended') await ctx.resume();

    const decoded = await ctx.decodeAudioData(arrayBuffer);
    if (!abortRef.current) return;

    // playFrom creates a new BufferSource starting at the given offset.
    // Stored as a Web Audio adapter on audioRef so pause/resume/rewind work.
    const playFrom = (offset) => {
      const node = ctx.createBufferSource();
      node.buffer = decoded;
      node.playbackRate.value = VOICE_SHAPE[voice]?.playbackRate ?? 1.0;
      node.connect(ctx.destination);

      const startCtxTime = ctx.currentTime;

      audioRef.current = {
        _isWebAudio: true,
        _node: node,
        get paused()      { return ctx.state === 'suspended'; },
        get currentTime() { return offset + (ctx.currentTime - startCtxTime); },
        rewindTo(t) {
          node.onended = null;
          try { node.stop(); node.disconnect(); } catch {}
          playFrom(Math.max(0, t));
        },
      };

      node.onended = () => {
        if (audioRef.current?._node === node) {
          audioRef.current = null;
          setSpeakingId(null);
          setPaused(false);
        }
      };

      node.start(0, offset);
    };

    setLoadingId(null);
    playFrom(0);
  }

  // ── speak ──────────────────────────────────────────────────────────────────

  async function speak(id, text) {
    if (speakingId === id) { stop(); return; }
    stop();
    setSpeakingId(id);
    setLoadingId(id);
    abortRef.current = new AbortController();

    // MUST be called synchronously here, before any await, while the user
    // gesture context is still live. This unlocks the AudioContext for all
    // subsequent playback — including after async fetch/decode on iOS.
    unlockAudioCtx();

    try {
      if (IS_IOS) {
        // iOS: decode through Web Audio API — same OpenAI voice as desktop
        await iosSpeak(id, text, abortRef.current.signal);
        return;
      }

      const canStream = typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg');
      if (!canStream) { fallbackSpeak(id, text); return; }

      const ms = new MediaSource();
      msRef.current = ms;
      const url = URL.createObjectURL(ms);
      blobUrl.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      shapeAudio(audio);
      audio.onended = () => { stopAudio(); setSpeakingId(null); setPaused(false); };
      audio.onerror = () => { stopAudio(); setSpeakingId(null); setPaused(false); };

      ms.addEventListener('sourceopen', async () => {
        let sb;
        try { sb = ms.addSourceBuffer('audio/mpeg'); } catch { return; }

        const res = await authedFetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice }),
          signal: abortRef.current?.signal,
        });
        if (!res.ok || !abortRef.current) return;

        const reader = res.body.getReader();
        const pump = async () => {
          const { done, value } = await reader.read();
          if (done) { try { if (ms.readyState === 'open') ms.endOfStream(); } catch {} return; }
          const wait = () => new Promise((r) => sb.updating ? sb.addEventListener('updateend', r, { once: true }) : r());
          await wait();
          if (!audioRef.current) return;
          try { sb.appendBuffer(value); } catch {}
          sb.addEventListener('updateend', pump, { once: true });
        };
        pump();
      });

      await audio.play();
      setLoadingId(null);
    } catch (e) {
      if (e?.name === 'AbortError') return;
      console.warn('[tts] falling back to Web Speech:', e?.message);
      stopAudio();
      setLoadingId(null);
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
      return (
        en.find((v) => /\b(aaron|eddy|daniel|gordon|james|tom|rishi)\b/i.test(v.name)) ||
        en.find((v) => /male/i.test(v.name)) ||
        en.find((v) => /google.*english/i.test(v.name) && /uk|en-gb/i.test(v.name + v.lang)) ||
        en.find((v) => /enhanced|premium/i.test(v.name) && !/samantha|karen|moira|victoria|tessa|fiona/i.test(v.name)) ||
        en[0]
      );
    }
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

  return { speakingId, loadingId, paused, speak, stop, pause, resume, rewind, forward, supported };
}
