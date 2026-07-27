import { supabase } from "@/integrations/supabase/client";

// Regex cleanup function to strip markdown formatting like **, __, #, etc.
export function sanitizeVoiceText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove bold **text**
    .replace(/\*(.*?)\*/g, "$1")     // Remove italic *text*
    .replace(/__(.*?)__/g, "$1")     // Remove underline __text__
    .replace(/#+\s?/g, "")           // Remove headers #
    .replace(/[`~]/g, "")            // Remove backticks and tildes
    .trim();
}

// Speak the sanitized text using browser Text-to-Speech
export function speakResponse(text: string, onEnd?: () => void) {
  if (!("speechSynthesis" in window)) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const cleanText = sanitizeVoiceText(text);
  const utterance = new SpeechSynthesisUtterance(cleanText);

  // Configure human-sounding vocal properties
  utterance.rate = 1.0;  // Normal conversational speed
  utterance.pitch = 1.0; // Standard pitch

  // Pick an English voice if available
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find(
    (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google"))
  );
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}