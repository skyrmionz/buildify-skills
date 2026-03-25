import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { validateAgentToken } from "../auth.js";
import { apiCall } from "../client.js";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

type Transition = "crossfade" | "slide-left" | "wipe" | "none";

type Segment = {
  screenCaptureIndex: number;
  narrationIndex: number;
  transition?: Transition;
};

type NarrationSegment = {
  index: number;
  text: string;
  audioDataUri: string;
  durationMs: number;
};

type ScreenCapture = {
  name: string;
  dataUri: string;
  type: string;
};

export const videoComposeTools = [
  {
    name: "compose_demo_video",
    description:
      "Compose a final demo video by stitching screen recordings with narration audio. Each segment pairs a screen capture with a narration segment. Supports transitions between segments. Saves the result to the demo's video config.",
    inputSchema: {
      type: "object" as const,
      properties: {
        segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              screenCaptureIndex: {
                type: "number",
                description:
                  "Index into the screenCaptures array in video config",
              },
              narrationIndex: {
                type: "number",
                description:
                  "Index into the narrationSegments array in video config",
              },
              transition: {
                type: "string",
                enum: ["crossfade", "slide-left", "wipe", "none"],
                description:
                  "Transition to use BEFORE this segment (default: none for first, crossfade for rest)",
              },
            },
            required: ["screenCaptureIndex", "narrationIndex"],
          },
          description:
            "Array of segments pairing screen captures with narration",
        },
      },
      required: ["segments"],
    },
  },
  {
    name: "preview_timeline",
    description:
      "Preview the timeline of a video composition without rendering. Shows segment durations, transitions, and total length. Use this to verify the composition before calling compose_demo_video.",
    inputSchema: {
      type: "object" as const,
      properties: {
        segments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              screenCaptureIndex: { type: "number" },
              narrationIndex: { type: "number" },
              transition: {
                type: "string",
                enum: ["crossfade", "slide-left", "wipe", "none"],
              },
            },
            required: ["screenCaptureIndex", "narrationIndex"],
          },
        },
      },
      required: ["segments"],
    },
  },
];

function decodeDataUri(dataUri: string, filePath: string): void {
  const match = dataUri.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) throw new Error("Invalid data URI");
  fs.writeFileSync(filePath, Buffer.from(match[1], "base64"));
}

function getExtFromDataUri(dataUri: string): string {
  const mimeMatch = dataUri.match(/^data:(\w+)\/(\w+)/);
  if (!mimeMatch) return "mp4";
  return mimeMatch[2] === "webm" ? "webm" : "mp4";
}

async function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve((metadata.format.duration || 0) * 1000);
    });
  });
}

export async function handleVideoCompose(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const context = await validateAgentToken();

  switch (name) {
    case "preview_timeline": {
      const segments = args.segments as Segment[];
      const videoConfig = await apiCall(
        `/api/demos/${context.demoId}/video`
      ).catch(() => ({}));

      const narrationSegments =
        (videoConfig?.narrationSegments as NarrationSegment[]) || [];
      const screenCaptures =
        (videoConfig?.screenCaptures as ScreenCapture[]) || [];

      let timeline = "=== Timeline Preview ===\n\n";
      let totalMs = 0;

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const narration = narrationSegments.find(
          (n) => n.index === seg.narrationIndex
        );
        const capture = screenCaptures[seg.screenCaptureIndex];
        const transition =
          seg.transition || (i === 0 ? "none" : "crossfade");
        const durationMs = narration?.durationMs || 5000;

        if (transition !== "none" && i > 0) {
          timeline += `  ↓ [${transition}] (0.5s)\n`;
        }

        timeline += `  Segment ${i + 1}: ${(durationMs / 1000).toFixed(1)}s\n`;
        timeline += `    Video: ${capture ? capture.name : `[missing: index ${seg.screenCaptureIndex}]`}\n`;
        timeline += `    Audio: ${narration ? `"${narration.text.slice(0, 60)}${narration.text.length > 60 ? "..." : ""}"` : `[missing: index ${seg.narrationIndex}]`}\n\n`;

        totalMs += durationMs;
      }

      timeline += `Total duration: ${(totalMs / 1000).toFixed(1)}s\n`;
      timeline += `Segments: ${segments.length}\n`;
      timeline += `Screen captures available: ${screenCaptures.length}\n`;
      timeline += `Narration segments available: ${narrationSegments.length}`;

      return timeline;
    }

    case "compose_demo_video": {
      const segments = args.segments as Segment[];

      if (!segments || segments.length === 0) {
        return "Error: No segments provided.";
      }

      const videoConfig = await apiCall(
        `/api/demos/${context.demoId}/video`
      ).catch(() => ({}));

      const narrationSegments =
        (videoConfig?.narrationSegments as NarrationSegment[]) || [];
      const screenCaptures =
        (videoConfig?.screenCaptures as ScreenCapture[]) || [];

      // Validate all references exist
      for (const seg of segments) {
        if (!screenCaptures[seg.screenCaptureIndex]) {
          return `Error: Screen capture index ${seg.screenCaptureIndex} not found. Available: 0-${screenCaptures.length - 1}`;
        }
        const narration = narrationSegments.find(
          (n) => n.index === seg.narrationIndex
        );
        if (!narration) {
          return `Error: Narration segment index ${seg.narrationIndex} not found.`;
        }
      }

      const tmpDir = path.join(os.tmpdir(), `buildify-compose-${Date.now()}`);
      fs.mkdirSync(tmpDir, { recursive: true });

      try {
        // Decode all clips and audio to temp files
        const clipPaths: string[] = [];
        const audioPaths: string[] = [];
        const durations: number[] = [];

        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const capture = screenCaptures[seg.screenCaptureIndex];
          const narration = narrationSegments.find(
            (n) => n.index === seg.narrationIndex
          )!;

          const ext = getExtFromDataUri(capture.dataUri);
          const clipPath = path.join(tmpDir, `clip-${i}.${ext}`);
          decodeDataUri(capture.dataUri, clipPath);
          clipPaths.push(clipPath);

          const audioPath = path.join(tmpDir, `audio-${i}.mp3`);
          decodeDataUri(narration.audioDataUri, audioPath);
          audioPaths.push(audioPath);

          durations.push(narration.durationMs);
        }

        // For single segment: just merge video + audio
        if (segments.length === 1) {
          const outputPath = path.join(tmpDir, "final.mp4");
          await mergeVideoAudio(
            clipPaths[0],
            audioPaths[0],
            durations[0],
            outputPath
          );

          const finalBuffer = fs.readFileSync(outputPath);
          const finalDataUri = `data:video/mp4;base64,${finalBuffer.toString("base64")}`;

          await apiCall(`/api/demos/${context.demoId}/video`, {
            method: "PATCH",
            body: { ...videoConfig, demoVideo: finalDataUri },
          });

          const sizeMB = (finalBuffer.length / (1024 * 1024)).toFixed(2);
          return `Demo video composed successfully (${sizeMB} MB, ${(durations[0] / 1000).toFixed(1)}s). Saved to Video tab.`;
        }

        // Multiple segments: merge each, then concatenate
        const mergedPaths: string[] = [];
        for (let i = 0; i < segments.length; i++) {
          const mergedPath = path.join(tmpDir, `merged-${i}.mp4`);
          await mergeVideoAudio(
            clipPaths[i],
            audioPaths[i],
            durations[i],
            mergedPath
          );
          mergedPaths.push(mergedPath);
        }

        // Build concat with transitions
        const transitions = segments.map((seg, i) =>
          i === 0 ? "none" : seg.transition || "crossfade"
        );

        const outputPath = path.join(tmpDir, "final.mp4");
        await concatenateWithTransitions(
          mergedPaths,
          transitions,
          outputPath
        );

        const finalBuffer = fs.readFileSync(outputPath);
        const finalDataUri = `data:video/mp4;base64,${finalBuffer.toString("base64")}`;

        await apiCall(`/api/demos/${context.demoId}/video`, {
          method: "PATCH",
          body: { ...videoConfig, demoVideo: finalDataUri },
        });

        const totalDuration = durations.reduce((a, b) => a + b, 0);
        const sizeMB = (finalBuffer.length / (1024 * 1024)).toFixed(2);
        return `Demo video composed successfully (${sizeMB} MB, ${(totalDuration / 1000).toFixed(1)}s, ${segments.length} segments). Saved to Video tab.`;
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }

    default:
      throw new Error(`Unknown video compose tool: ${name}`);
  }
}

/**
 * Merge a video clip with an audio track, trimming or looping the video
 * to match the audio duration.
 */
function mergeVideoAudio(
  videoPath: string,
  audioPath: string,
  durationMs: number,
  outputPath: string
): Promise<void> {
  const durationSec = durationMs / 1000;
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        "-c:v libx264",
        "-c:a aac",
        `-t ${durationSec}`,
        "-pix_fmt yuv420p",
        "-shortest",
        "-y",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

/**
 * Concatenate multiple video files with optional transitions between them.
 * Uses ffmpeg's xfade filter for crossfade transitions.
 */
function concatenateWithTransitions(
  videoPaths: string[],
  transitions: string[],
  outputPath: string
): Promise<void> {
  if (videoPaths.length === 1) {
    fs.copyFileSync(videoPaths[0], outputPath);
    return Promise.resolve();
  }

  // For simple concat without transitions, use concat demuxer
  const hasTransitions = transitions.some(
    (t) => t !== "none" && t !== undefined
  );

  if (!hasTransitions) {
    // Simple concatenation via concat demuxer
    const listPath = outputPath + ".txt";
    const listContent = videoPaths
      .map((p) => `file '${p}'`)
      .join("\n");
    fs.writeFileSync(listPath, listContent);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(listPath)
        .inputOptions(["-f concat", "-safe 0"])
        .outputOptions(["-c copy", "-y"])
        .output(outputPath)
        .on("end", () => {
          fs.unlinkSync(listPath);
          resolve();
        })
        .on("error", (err: Error) => reject(err))
        .run();
    });
  }

  // With transitions: chain xfade filters
  // This builds a complex filter graph for crossfade transitions
  const transitionDuration = 0.5; // seconds

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg();

    // Add all inputs
    for (const vp of videoPaths) {
      cmd = cmd.input(vp);
    }

    // Build xfade filter chain
    const filters: string[] = [];
    let lastLabel = "[0:v]";
    let lastAudioLabel = "[0:a]";

    for (let i = 1; i < videoPaths.length; i++) {
      const outputLabel =
        i < videoPaths.length - 1 ? `[v${i}]` : "[vout]";
      const audioOutputLabel =
        i < videoPaths.length - 1 ? `[a${i}]` : "[aout]";
      const transition = transitions[i] || "crossfade";

      // Map transition type to ffmpeg xfade transition name
      let xfadeTransition = "fade";
      if (transition === "slide-left") xfadeTransition = "slideleft";
      else if (transition === "wipe") xfadeTransition = "wiperight";
      else xfadeTransition = "fade";

      // Video crossfade
      filters.push(
        `${lastLabel}[${i}:v]xfade=transition=${xfadeTransition}:duration=${transitionDuration}:offset=0${outputLabel}`
      );

      // Audio crossfade
      filters.push(
        `${lastAudioLabel}[${i}:a]acrossfade=d=${transitionDuration}${audioOutputLabel}`
      );

      lastLabel = outputLabel;
      lastAudioLabel = audioOutputLabel;
    }

    cmd
      .complexFilter(filters, ["vout", "aout"])
      .outputOptions([
        "-c:v libx264",
        "-c:a aac",
        "-pix_fmt yuv420p",
        "-y",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}
