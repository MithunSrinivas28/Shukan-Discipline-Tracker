// Web Speech API wrappers for STT and TTS.
export function speak(text: string, onEnd?: () => void) {
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => /en-US|en-GB/i.test(v.lang) && /female|samantha|google/i.test(v.name)) ||
      voices.find((v) => /en/i.test(v.lang));
    if (preferred) u.voice = preferred;
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  } catch {
    onEnd?.();
  }
}

export function stopSpeaking() {
  try {
    window.speechSynthesis.cancel();
  } catch {}
}

type SRCallbacks = {
  onPartial?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
};

export function createRecognizer(cb: SRCallbacks) {
  const SR: any =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "en-US";

  let finalText = "";
  rec.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalText += t + " ";
      else interim += t;
    }
    cb.onPartial?.((finalText + interim).trim());
  };
  rec.onerror = (e: any) => cb.onError?.(e.error ?? "error");
  rec.onend = () => {
    if (finalText.trim()) cb.onFinal?.(finalText.trim());
    cb.onEnd?.();
  };
  return {
    start: () => {
      finalText = "";
      rec.start();
    },
    stop: () => {
      try {
        rec.stop();
      } catch {}
    },
  };
}

export function speechSupported() {
  return (
    typeof window !== "undefined" &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) &&
    "speechSynthesis" in window
  );
}
