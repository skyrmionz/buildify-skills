import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { validateAgentToken } from "../auth.js";
import { apiCall } from "../client.js";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

async function getElevenlabsKey(): Promise<string> {
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
  return data.elevenlabsApiKey;
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
  const apiKey = await getElevenlabsKey();

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

      // Decode voice recording to temp file
      const tmpDir = path.join(os.tmpdir(), `buildify-voice-${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      try {
        const base64Match = voiceRecording.match(
          /^data:audio\/[\w+]+;base64,(.+)$/
        );
        if (!base64Match) {
          return "Error: Voice recording is not a valid audio data URI.";
        }

        const audioBuffer = Buffer.from(base64Match[1], "base64");
        const audioPath = path.join(tmpDir, "voice-sample.mp3");
        fs.writeFileSync(audioPath, audioBuffer);

        // Call ElevenLabs Instant Voice Clone API
        const formData = new FormData();
        formData.append("name", voiceName);
        formData.append(
          "files",
          new Blob([audioBuffer], { type: "audio/mpeg" }),
          "voice-sample.mp3"
        );
        formData.append(
          "description",
          "Cloned voice for demo video narration"
        );

        const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
          },
          body: formData,
        });

        if (!res.ok) {
          const err = await res.text();
          return `Error cloning voice: ${res.status} ${err}`;
        }

        const data = await res.json();
        const voiceId = data.voice_id;

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

      // Get voice ID from video config
      const videoConfig = await apiCall(
        `/api/demos/${context.demoId}/video`
      ).catch(() => ({}));
      const voiceId = videoConfig?.voiceId as string | undefined;

      if (!voiceId) {
        return "Error: No cloned voice found. Run clone_voice first.";
      }

      const results: Array<{
        index: number;
        text: string;
        audioDataUri: string;
        durationMs: number;
      }> = [];

      for (const segment of segments) {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text: segment.text,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.5,
              },
            }),
          }
        );

        if (!res.ok) {
          const err = await res.text();
          return `Error generating narration for segment ${segment.index}: ${res.status} ${err}`;
        }

        const audioBuffer = Buffer.from(await res.arrayBuffer());
        const audioDataUri = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;

        // Estimate duration from MP3 file size (128kbps ≈ 16KB/s)
        const estimatedDurationMs = Math.round(
          (audioBuffer.length / 16000) * 1000
        );

        results.push({
          index: segment.index,
          text: segment.text,
          audioDataUri,
          durationMs: estimatedDurationMs,
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
    }

    case "generate_full_narration": {
      const text = args.text as string;
      if (!text) {
        return "Error: No text provided.";
      }

      const videoConfig = await apiCall(
        `/api/demos/${context.demoId}/video`
      ).catch(() => ({}));
      const voiceId = videoConfig?.voiceId as string | undefined;

      if (!voiceId) {
        return "Error: No cloned voice found. Run clone_voice first.";
      }

      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.5,
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        return `Error generating narration: ${res.status} ${err}`;
      }

      const audioBuffer = Buffer.from(await res.arrayBuffer());
      const audioDataUri = `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`;
      const estimatedDurationMs = Math.round(
        (audioBuffer.length / 16000) * 1000
      );

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
              durationMs: estimatedDurationMs,
            },
          ],
        },
      });

      const sizeMB = (audioBuffer.length / (1024 * 1024)).toFixed(2);
      return `Full narration generated (${(estimatedDurationMs / 1000).toFixed(1)}s, ${sizeMB} MB). Saved to video config. Use compose_demo_video to combine with screen recordings.`;
    }

    default:
      throw new Error(`Unknown voice synthesis tool: ${name}`);
  }
}
