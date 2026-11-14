const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

/** Warm conversational voice (Rachel) */
export const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
export const TTS_MODEL = "eleven_flash_v2_5";

export async function transcribeAudio(
  bytes: ArrayBuffer,
  filename: string,
  mimeType: string
): Promise<{ text: string; ms: number; source: string } | null> {
  const t0 = Date.now();
  if (ELEVEN_KEY) {
    try {
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: mimeType || "audio/webm" }), filename || "audio.webm");
      form.append("model_id", "scribe_v1");
      const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": ELEVEN_KEY },
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.text || data.transcript || "";
        if (text) return { text, ms: Date.now() - t0, source: "elevenlabs_scribe" };
      } else {
        console.error("Scribe error:", res.status, await res.text());
      }
    } catch (err) {
      console.error("Scribe fetch error:", err);
    }
  }
  if (OPENAI_KEY) {
    try {
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: mimeType || "audio/webm" }), filename || "audio.webm");
      form.append("model", "gpt-4o-mini-transcribe");
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: "Bearer " + OPENAI_KEY },
        body: form,
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.text || "";
        if (text) return { text, ms: Date.now() - t0, source: "openai_transcribe" };
      } else {
        console.error("OpenAI transcribe error:", res.status, await res.text());
      }
    } catch (err) {
      console.error("OpenAI transcribe fetch error:", err);
    }
  }
  return null;
}

export async function synthesizeSpeech(
  text: string,
  language: "en" | "es"
): Promise<{ audio: ArrayBuffer; ms: number } | null> {
  if (!ELEVEN_KEY) return null;
  const t0 = Date.now();
  try {
    const res = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/" + ELEVENLABS_VOICE_ID + "/stream",
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVEN_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: TTS_MODEL,
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      }
    );
    if (!res.ok) {
      console.error("TTS error:", res.status, await res.text());
      return null;
    }
    const audio = await res.arrayBuffer();
    return { audio, ms: Date.now() - t0 };
  } catch (err) {
    console.error("TTS fetch error:", err);
    return null;
  }
}
