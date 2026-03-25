import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { validateAgentToken } from "../auth.js";
import { apiCall } from "../client.js";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const APP_URL = process.env.APP_URL || "http://localhost:3000";

async function getElevenlabsClient(): Promise<ElevenLabsClient> {
  const token = process.env.DEMO_TOOL_TOKEN || "";
  const res = await fetch(`${APP_URL}/api/agent/keys`, {
    headers: { "X-Agent-Token": token },
  });
  if (!res.ok) throw new Error("Failed to fetch API keys");
  const data = await res.json();
  if (!data.elevenlabsApiKey) {
    throw new Error(
      "ElevenLabs API key not configured. Ask the user to add it in Settings → API Keys."
    );
  }
  return new ElevenLabsClient({ apiKey: data.elevenlabsApiKey });
}

/** Get exact audio duration in milliseconds using ffprobe */
function getAudioDurationMs(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const durationSec = metadata.format?.duration;
      if (durationSec == null) return reject(new Error("Could not determine audio duration"));
      resolve(Math.round(durationSec * 1000));
    });
  });
}

/** Convert a ReadableStream<Uint8Array> to a Buffer */
async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** Write audio buffer to temp file, measure duration with ffprobe, clean up */
async function measureDuration(audioBuffer: Buffer, tmpDir: string, label: string): Promise<number> {
  const tmpFile = path.join(tmpDir, `${label}.mp3`);
  fs.writeFileSync(tmpFile, audioBuffer);
  try {
    return await getAudioDurationMs(tmpFile);
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

export const voiceSynthesisTools = [
  {
    name: "clone_voice",
    description:
      "Clone the user's voice using their uploaded voice recording from the video config. Returns a voice ID that can be used for narration generation. The voice recording must be uploaded first in the Video tab.",
    inputSchema: {
      type: "object" as const,
      properties: {
        voiceName: {
          type: "string",
          description:
            "Optional name for the cloned voice (default: 'Demo Voice')",
        },
      },
    },
  },
  {
    name: "generate_narration",
    description:
      "Generate narration audio for multiple script segments using the cloned voice. Returns per-segment audio with exact durations for timeline synchronization. Must clone_voice first.",
    inputSchema: {
      type: "object" as const,
      properties: {
        segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The text to speak for this segment",
              },
              index: {
                type: "number",
                description: "Segment index for ordering",
              },
            },
            required: ["text", "index"],
          },
          description: "Array of script segments to generate narration for",
        },
        modelId: {
          type: "string",
          description:
            "ElevenLabs model ID (default: 'eleven_v3'). Use 'eleven_flash_v2_5' for lower latency at 50% cost.",
        },
        stability: {
          type: "number",
          description: "Voice stability 0-1 (default: 0.5). Higher = more consistent, lower = more expressive.",
        },
        similarityBoost: {
          type: "number",
          description: "Similarity to original voice 0-1 (default: 0.75). Higher = closer to original.",
        },
        style: {
          type: "number",
          description: "Style exaggeration 0-1 (default: 0.5). Higher = more expressive but uses more compute.",
        },
      },
      required: ["segments"],
    },
  },
  {
    name: "generate_full_narration",
    description:
      "Generate a single narration audio track from a full script text using the cloned voice. Simpler alternative to segment-based narration. Must clone_voice first.",
    inputSchema: {
      type: "object" as const,
      properties: {
        text: {
          type: "string",
          description: "The full script text to generate narration for",
        },
        modelId: {
          type: "string",
          description:
            "ElevenLabs model ID (default: 'eleven_v3'). Use 'eleven_flash_v2_5' for lower latency at 50% cost.",
        },
        stability: {
          type: "number",
          description: "Voice stability 0-1 (default: 0.5). Higher = more consistent, lower = more expressive.",
        },
        similarityBoost: {
          type: "number",
          description: "Similarity to original voice 0-1 (default: 0.75). Higher = closer to original.",
        },
        style: {
          type: "number",
          description: "Style exaggeration 0-1 (default: 0.5). Higher = more expressive but uses more compute.",
        },
      },
      required: ["text"],
    },
  },
];

export async function handleVoiceSynthesis(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const context = await validateAgentToken();
  const client = await getElevenlabsClient();

  switch (name) {
    case "clone_voice": {
      const voiceName = (args.voiceName as string) || "Demo Voice";

      // Get voice recording from video config
      const videoConfig = await apiCall(
        `/api/demos/${context.demoId}/video`
      ).catch(() => ({}));
      const voiceRecording = videoConfig?.voiceRecording as string | undefined;

      if (!voiceRecording || !voiceRecording.startsWith("data:")) {
        return "Error: No voice recording found. Ask the user to upload a voice recording in the Video tab first.";
      }

      // Decode voice recording(s) to temp files
      const tmpDir = path.join(os.tmpdir(), `buildify-voice-${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      try {
        // Support single recording or multiple (future: voiceRecordings array)
        const recordings = Array.isArray(voiceRecording)
          ? voiceRecording
          : [voiceRecording];

        const files: fs.ReadStream[] = [];
        for (let i = 0; i < recordings.length; i++) {
          const base64Match = recordings[i].match(
            /^data:audio\/[\w+]+;base64,(.+)$/
          );
          if (!base64Match) {
            return `Error: Voice recording ${i + 1} is not a valid audio data URI.`;
          }
          const audioBuffer = Buffer.from(base64Match[1], "base64");
          const audioPath = path.join(tmpDir, `voice-sample-${i}.mp3`);
          fs.writeFileSync(audioPath, audioBuffer);
          files.push(fs.createReadStream(audioPath));
        }

        // Use SDK for Instant Voice Clone
        const response = await client.voices.ivc.create({
          name: voiceName,
          files,
          description: "Cloned voice for demo video narration",
          removeBackgroundNoise: true,
        });

        const voiceId = response.voiceId;

        // Save voice ID to video config
        await apiCall(`/api/demos/${context.demoId}/video`, {
          method: "PATCH",
          body: { ...videoConfig, voiceId },
        });

        return `Voice cloned successfully. Voice ID: ${voiceId}. Name: "${voiceName}". You can now use generate_narration or generate_full_narration to create speech.`;
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }

    case "generate_narration": {
      const segments = args.segments as Array<{
        text: string;
        index: number;
      }>;

      if (!segments || segments.length === 0) {
        return "Error: No segments provided.";
      }

      const modelId = (args.modelId as string) || "eleven_v3";
      const stability = (args.stability as number) ?? 0.5;
      const similarityBoost = (args.similarityBoost as number) ?? 0.75;
      const style = (args.style as number) ?? 0.5;

      // Get voice ID from video config
      const videoConfig = await apiCall(
        `/api/demos/${context.demoId}/video`
      ).catch(() => ({}));
      const voiceId = videoConfig?.voiceId as string | undefined;

      if (!voiceId) {
        return "Error: No cloned voice found. Run clone_voice first.";
      }

      const tmpDir = path.join(os.tmpdir(), `buildify-narration-${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      try {
        const results: Array<{
          index: number;
          text: string;
          audioDataUri: string;
          durationMs: number;
        }> = [];

        for (const segment of segments) {
          const response = await client.textToSpeech.convert(voiceId, {
            text: segment.text,
            modelId,
            outputFormat: "mp3_44100_128",
            voiceSettings: { stability, similarityBoost, style },
          });

          const audioBuffer = await streamToBuffer(response);
          const audioDataUri = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;

          // Measure exact duration with ffprobe
          const durationMs = await measureDuration(audioBuffer, tmpDir, `segment-${segment.index}`);

          results.push({
            index: segment.index,
            text: segment.text,
            audioDataUri,
            durationMs,
          });
        }

        // Save narration segments to video config
        await apiCall(`/api/demos/${context.demoId}/video`, {
          method: "PATCH",
          body: { ...videoConfig, narrationSegments: results },
        });

        const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
        const summary = results
          .map(
            (r) =>
              `  Segment ${r.index}: ${(r.durationMs / 1000).toFixed(1)}s — "${r.text.slice(0, 50)}..."`
          )
          .join("\n");

        return `Generated ${results.length} narration segments (total: ${(totalDuration / 1000).toFixed(1)}s).\n${summary}\n\nNarration saved to video config. Use compose_demo_video to combine with screen recordings.`;
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }

    case "generate_full_narration": {
      const text = args.text as string;
      if (!text) {
        return "Error: No text provided.";
      }

      const modelId = (args.modelId as string) || "eleven_v3";
      const stability = (args.stability as number) ?? 0.5;
      const similarityBoost = (args.similarityBoost as number) ?? 0.75;
      const style = (args.style as number) ?? 0.5;

      const videoConfig = await apiCall(
        `/api/demos/${context.demoId}/video`
      ).catch(() => ({}));
      const voiceId = videoConfig?.voiceId as string | undefined;

      if (!voiceId) {
        return "Error: No cloned voice found. Run clone_voice first.";
      }

      const tmpDir = path.join(os.tmpdir(), `buildify-narration-${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      try {
        const response = await client.textToSpeech.convert(voiceId, {
          text,
          modelId,
          outputFormat: "mp3_44100_128",
          voiceSettings: { stability, similarityBoost, style },
        });

        const audioBuffer = await streamToBuffer(response);
        const audioDataUri = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;

        // Measure exact duration with ffprobe
        const durationMs = await measureDuration(audioBuffer, tmpDir, "full-narration");

        // Save as single narration segment
        await apiCall(`/api/demos/${context.demoId}/video`, {
          method: "PATCH",
          body: {
            ...videoConfig,
            narrationSegments: [
              {
                index: 0,
                text,
                audioDataUri,
                durationMs,
              },
            ],
          },
        });

        const sizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(2);
        return `Full narration generated (${(durationMs / 1000).toFixed(1)}s, ${sizeMB} MB). Saved to video config. Use compose_demo_video to combine with screen recordings.`;
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }

    default:
      throw new Error(`Unknown voice synthesis tool: ${name}`);
  }
}
