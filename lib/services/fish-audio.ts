/**
 * Fish Audio S2.1 Pro Voice Synthesis & Cloning Service
 * Implements S2.1 Pro Free API integration:
 * - Free text-to-speech with model header 's2.1-pro-free'
 * - Instant voice model creation via /model endpoint
 * - Direct synthesis from reference_id
 */

import fs from 'fs';
import path from 'path';

export interface FishTTSOptions {
  model?: string;             // Defaults to 's2.1-pro-free'
  format?: 'mp3' | 'wav' | 'opus';
  mp3Bitrate?: 128 | 192;
  latency?: 'normal' | 'balanced';
}

/**
 * Upload an audio sample to Fish Audio to create a cloned voice model.
 * Endpoint: POST https://api.fish.audio/model
 */
export async function createClonedVoiceModel(
  title: string,
  description: string,
  audioFilePath: string
): Promise<string> {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) {
    throw new Error('FISH_AUDIO_API_KEY is not defined in environment variables');
  }

  const fileBytes = fs.readFileSync(audioFilePath);
  const filename = path.basename(audioFilePath);
  const mimeType = audioFilePath.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg';

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('type', 'tts');
  formData.append('visibility', 'private');
  formData.append('train_mode', 'fast');
  formData.append('voices', new Blob([fileBytes], { type: mimeType }), filename);

  const res = await fetch('https://api.fish.audio/model', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Fish Audio model creation failed (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data._id || data.id;
}

/**
 * Generate speech using a cloned voice model on Fish Audio's S2.1 Pro Free API.
 * Endpoint: POST https://api.fish.audio/v1/tts
 */
export async function synthesizeClonedSpeech(
  text: string,
  referenceId: string,
  options: FishTTSOptions = {}
): Promise<Buffer> {
  const apiKey = process.env.FISH_AUDIO_API_KEY;
  if (!apiKey) {
    throw new Error('FISH_AUDIO_API_KEY is not defined in environment variables');
  }

  // Sanitize text and ensure terminal punctuation to prevent audio cutoff
  let cleanText = text
    .replace(/^["'“](.*)["'”]$/g, '$1')
    .replace(/^[A-Za-z0-9\s"']+:[\s]*/, '')
    .replace(/\*.*?\*/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim();

  if (cleanText && !/[.!?]$/.test(cleanText)) {
    cleanText += '.';
  }

  const payload = {
    text: cleanText,
    reference_id: referenceId,
    format: options.format || 'mp3',
    mp3_bitrate: options.mp3Bitrate || 128,
    latency: options.latency || 'normal',
    max_new_tokens: 2048,
  };

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch('https://api.fish.audio/v1/tts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          // S2.1 Pro Free Model header from Fish Audio
          model: options.model || 's2.1-pro-free',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Fish Audio TTS failed (${res.status}): ${errorText}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      lastError = err;
      if (attempt < 2) {
        console.warn(`Fish Audio TTS attempt ${attempt} timed out or failed (${err instanceof Error ? err.message : String(err)}). Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
