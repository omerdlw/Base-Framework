import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  extractYouTubeVideoId,
  getYouTubeStreamUrl,
  getYouTubeThumbnailUrl,
  isDirectVideoUrl,
  isYouTubeUrl,
  parseYouTubeTimeParam,
  parseYouTubeUrlConfig,
} from "../src/core/modules/background/youtube.ts";

test("extractYouTubeVideoId parses standard watch, short, embed, live, music, and youtu.be URLs", () => {
  assert.equal(
    extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(
    extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?t=42"),
    "dQw4w9WgXcQ",
  );
  assert.equal(
    extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(
    extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(
    extractYouTubeVideoId("https://music.youtube.com/watch?v=dQw4w9WgXcQ"),
    "dQw4w9WgXcQ",
  );
  assert.equal(extractYouTubeVideoId("youtube:dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(
    extractYouTubeVideoId("dQw4w9WgXcQ", { allowBareId: true }),
    "dQw4w9WgXcQ",
  );
  assert.equal(extractYouTubeVideoId("/media/local-video.mp4"), null);
});

test("parseYouTubeTimeParam and parseYouTubeUrlConfig extract start and end times", () => {
  assert.equal(parseYouTubeTimeParam("90"), 90);
  assert.equal(parseYouTubeTimeParam("1m30s"), 90);
  assert.equal(parseYouTubeTimeParam("1h2m3s"), 3723);

  const parsed = parseYouTubeUrlConfig(
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m15s&end=120",
  );
  assert.ok(parsed);
  assert.equal(parsed.videoId, "dQw4w9WgXcQ");
  assert.equal(parsed.startTime, 75);
  assert.equal(parsed.endTime, 120);
});

test("getYouTubeStreamUrl and getYouTubeThumbnailUrl generate valid stream and proxy endpoints", () => {
  assert.equal(
    getYouTubeStreamUrl("dQw4w9WgXcQ", {
      stream: "video",
      quality: "1080p",
      codec: "hevc",
    }),
    "/api/background/youtube?id=dQw4w9WgXcQ&stream=video&quality=1080p&codec=hevc",
  );
  assert.equal(
    getYouTubeThumbnailUrl("dQw4w9WgXcQ", true),
    "/api/background/youtube?id=dQw4w9WgXcQ&stream=thumbnail",
  );
  assert.equal(isYouTubeUrl("https://youtu.be/dQw4w9WgXcQ"), true);
  assert.equal(isDirectVideoUrl("/videos/hero.mp4"), true);
  assert.equal(
    isDirectVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    true,
  );
});

test("Background module and API route provide YouTube stream extraction and dual-engine playback", () => {
  const apiRoutePath = path.resolve("src/app/api/background/youtube/route.ts");
  assert.ok(
    fs.existsSync(apiRoutePath),
    "YouTube background stream extractor API route must exist",
  );
  const apiRouteContent = fs.readFileSync(apiRoutePath, "utf8");
  assert.ok(
    apiRouteContent.includes("export async function GET(") &&
      apiRouteContent.includes("ANDROID_VR") &&
      apiRouteContent.includes("IOS"),
    "YouTube API route must implement Innertube multi-client extraction and byte-range proxy",
  );

  const viewContent = fs.readFileSync(
    path.resolve("src/core/modules/background/view.tsx"),
    "utf8",
  );
  assert.ok(
    viewContent.includes("YouTubeBackgroundPlayer"),
    "BackgroundOverlay view.tsx must render YouTubeBackgroundPlayer for YouTube URLs",
  );
});
