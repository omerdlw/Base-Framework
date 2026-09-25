export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InnertubeFormat {
  approxDurationMs?: string;
  audioChannels?: number;
  audioQuality?: string;
  audioSampleRate?: string;
  averageBitrate?: number;
  bitrate?: number;
  contentLength?: string;
  fps?: number;
  height?: number;
  itag: number;
  mimeType?: string;
  quality?: string;
  qualityLabel?: string;
  url?: string;
  width?: number;
  _clientPriority?: number;
  _clientUserAgent?: string;
}

interface ResolvedStreamCandidate {
  clientPriority: number;
  codec: "hevc" | "av1" | "h264" | "vp9" | "mp4a" | "opus" | "unknown";
  contentLength: number;
  fps: number;
  height: number;
  itag: number;
  mimeType: string;
  qualityLabel: string;
  url: string;
  userAgent: string;
  width: number;
}

interface CachedYouTubeData {
  audioStreams: ResolvedStreamCandidate[];
  author: string;
  durationSeconds: number;
  expiresAt: number;
  hlsManifestUrl: string | null;
  muxedStreams: ResolvedStreamCandidate[];
  thumbnailUrl: string;
  title: string;
  usingMuxedForVideo: boolean;
  videoId: string;
  videoStreams: ResolvedStreamCandidate[];
}

interface CachedMediaBuffer {
  buffer: Uint8Array;
  expiresAt: number;
  mimeType: string;
}

const STREAM_CACHE_TTL_MS = 15 * 60 * 1000;
const UPSTREAM_SLICE_BYTES = 1536 * 1024;
const MAX_VIDEO_RESPONSE_WINDOW = 6 * 1024 * 1024;
const MAX_BUFFER_CACHE_ENTRIES = 8;

const streamCache = new Map<string, CachedYouTubeData>();
const mediaBufferCache = new Map<string, CachedMediaBuffer>();
const pendingBufferDownloads = new Map<
  string,
  Promise<CachedMediaBuffer | null>
>();

const ANDROID_USER_AGENT =
  "com.google.android.youtube/20.10.38 (Linux; U; Android 14; en_US) gzip";
const ANDROID_VR_USER_AGENT =
  "com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip";
const IOS_USER_AGENT =
  "com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 18_3_2 like Mac OS X;)";

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function extractVideoId(input: string | null | undefined): string | null {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  const prefixedMatch = trimmed.match(/^(?:youtube|yt):([a-zA-Z0-9_-]{11})$/i);
  if (prefixedMatch) return prefixedMatch[1];

  try {
    const parsed = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`,
    );
    const host = parsed.hostname
      .replace(/^(www\.|m\.|music\.)/i, "")
      .toLowerCase();

    if (host === "youtu.be") {
      const seg = parsed.pathname.split("/").filter(Boolean)[0];
      if (seg && YOUTUBE_ID_REGEX.test(seg)) return seg;
    }

    if (
      host === "youtube.com" ||
      host === "youtube-nocookie.com" ||
      host.endsWith(".youtube.com")
    ) {
      const vParam =
        parsed.searchParams.get("v") || parsed.searchParams.get("vi");
      if (vParam && YOUTUBE_ID_REGEX.test(vParam)) return vParam;

      const segments = parsed.pathname.split("/").filter(Boolean);
      if (
        segments.length >= 2 &&
        ["embed", "shorts", "live", "v", "e", "watch"].includes(
          segments[0].toLowerCase(),
        )
      ) {
        const candidate = segments[1];
        if (candidate && YOUTUBE_ID_REGEX.test(candidate)) return candidate;
      }
    }
  } catch {}

  const fallbackMatch = trimmed.match(
    /(?:v=|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/,
  );
  return fallbackMatch ? fallbackMatch[1] : null;
}

function detectCodec(
  mimeType = "",
): "hevc" | "av1" | "h264" | "vp9" | "mp4a" | "opus" | "unknown" {
  const lower = mimeType.toLowerCase();
  if (
    lower.includes("hev1") ||
    lower.includes("hvc1") ||
    lower.includes("hevc")
  ) {
    return "hevc";
  }
  if (lower.includes("av01")) return "av1";
  if (lower.includes("avc1") || lower.includes("h264")) return "h264";
  if (lower.includes("vp09") || lower.includes("vp9")) return "vp9";
  if (lower.includes("mp4a")) return "mp4a";
  if (lower.includes("opus") || lower.includes("vorbis")) return "opus";
  return "unknown";
}

function parseQualityHeight(
  qualityLabel = "",
  fallbackHeight = 0,
  fallbackWidth = 0,
): number {
  const match = qualityLabel.match(/(\d{3,4})p/i);
  if (match) return parseInt(match[1], 10);
  const longEdge = Math.max(fallbackWidth, fallbackHeight);
  if (longEdge >= 1880 && longEdge <= 1960) return 1080;
  if (longEdge >= 1240 && longEdge <= 1320) return 720;
  if (longEdge >= 2520 && longEdge <= 2600) return 1440;
  if (longEdge >= 3800 && longEdge <= 3880) return 2160;
  return fallbackHeight;
}

function normalizeCandidate(
  fmt: InnertubeFormat,
  fallbackUserAgent: string,
): ResolvedStreamCandidate | null {
  if (!fmt || !fmt.url || !fmt.mimeType) return null;
  const cleanMime = fmt.mimeType.split(";")[0].trim() || "video/mp4";
  const width = Number(fmt.width) || 0;
  const rawHeight = Number(fmt.height) || 0;
  const normalizedHeight = parseQualityHeight(
    fmt.qualityLabel || "",
    rawHeight,
    width,
  );
  const label = fmt.qualityLabel || `${normalizedHeight || rawHeight}p`;
  return {
    clientPriority: fmt._clientPriority ?? 1,
    codec: detectCodec(fmt.mimeType),
    contentLength: Number(fmt.contentLength) || 0,
    fps: Number(fmt.fps) || 30,
    height: normalizedHeight,
    itag: Number(fmt.itag) || 0,
    mimeType: cleanMime,
    qualityLabel: label,
    url: fmt.url,
    userAgent: fmt._clientUserAgent || fallbackUserAgent,
    width,
  };
}

const VISIONOS_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)";

let cachedVisitorData: { expiresAt: number; value: string } | null = null;

async function getVisitorData(videoId: string): Promise<string | null> {
  const now = Date.now();
  if (cachedVisitorData && cachedVisitorData.expiresAt > now) {
    return cachedVisitorData.value;
  }
  try {
    const embedHtml = await fetch(
      `https://www.youtube.com/embed/${videoId}`,
      {
        headers: { "User-Agent": VISIONOS_USER_AGENT },
        cache: "no-store",
      },
    ).then((r) => r.text());

    const visitorData = embedHtml.match(/"VISITOR_DATA":"([^"]+)"/)?.[1];
    if (visitorData) {
      cachedVisitorData = {
        expiresAt: now + 30 * 60 * 1000,
        value: visitorData,
      };
      return visitorData;
    }
    return null;
  } catch {
    return null;
  }
}

interface Mp4BoxSlice {
  dataOffset: number;
  end: number;
  offset: number;
  size: number;
}

function findMp4Box(
  buf: Buffer,
  type: string,
  start = 0,
  end = buf.length,
): Mp4BoxSlice | null {
  let off = start;
  while (off + 8 <= end) {
    const sz = buf.readUInt32BE(off);
    const tp = buf.subarray(off + 4, off + 8).toString("ascii");
    if (sz < 8 || off + sz > end) break;
    if (tp === type) {
      return { dataOffset: off + 8, end: off + sz, offset: off, size: sz };
    }
    off += sz;
  }
  return null;
}

function findAllMp4Boxes(
  buf: Buffer,
  type: string,
  start = 0,
  end = buf.length,
): Mp4BoxSlice[] {
  const res: Mp4BoxSlice[] = [];
  let off = start;
  while (off + 8 <= end) {
    const sz = buf.readUInt32BE(off);
    const tp = buf.subarray(off + 4, off + 8).toString("ascii");
    if (sz < 8 || off + sz > end) break;
    if (tp === type) {
      res.push({ dataOffset: off + 8, end: off + sz, offset: off, size: sz });
    }
    off += sz;
  }
  return res;
}

function makeMp4Box(type: string, payloads: Buffer[]): Buffer {
  const totalPayload = payloads.reduce((sum, p) => sum + p.length, 0);
  const out = Buffer.allocUnsafe(8 + totalPayload);
  out.writeUInt32BE(8 + totalPayload, 0);
  out.write(type, 4, 4, "ascii");
  let pos = 8;
  for (const p of payloads) {
    p.copy(out, pos);
    pos += p.length;
  }
  return out;
}

function remuxVisionOsWithItag18Audio(
  bMap: Buffer,
  bFull: Buffer,
  b18: Buffer,
): Uint8Array | null {
  try {
    const moof = findMp4Box(bFull, "moof");
    const mdatVideo = findMp4Box(bFull, "mdat");
    if (!moof || !mdatVideo) return null;

    const traf = findMp4Box(bFull, "traf", moof.dataOffset, moof.end);
    if (!traf) return null;
    const tfhd = findMp4Box(bFull, "tfhd", traf.dataOffset, traf.end);
    const trun = findMp4Box(bFull, "trun", traf.dataOffset, traf.end);
    if (!trun) return null;

    let defaultSampleDuration = 40;
    let defaultSampleSize = 0;
    let defaultSampleFlags = 0x10000;
    if (tfhd) {
      const tfhdFlags = bFull.readUInt32BE(tfhd.dataOffset) & 0xffffff;
      let tfhdPtr = tfhd.dataOffset + 8;
      if (tfhdFlags & 0x000001) tfhdPtr += 8;
      if (tfhdFlags & 0x000002) tfhdPtr += 4;
      if (tfhdFlags & 0x000008 && tfhdPtr + 4 <= tfhd.end) {
        defaultSampleDuration = bFull.readUInt32BE(tfhdPtr) || 40;
        tfhdPtr += 4;
      }
      if (tfhdFlags & 0x000010 && tfhdPtr + 4 <= tfhd.end) {
        defaultSampleSize = bFull.readUInt32BE(tfhdPtr);
        tfhdPtr += 4;
      }
      if (tfhdFlags & 0x000020 && tfhdPtr + 4 <= tfhd.end) {
        defaultSampleFlags = bFull.readUInt32BE(tfhdPtr);
      }
    }

    const versionFlags = bFull.readUInt32BE(trun.dataOffset);
    const sampleCount = bFull.readUInt32BE(trun.dataOffset + 4);
    if (sampleCount <= 0) return null;

    let ptr = trun.dataOffset + 8;
    if (versionFlags & 0x1) ptr += 4;
    const hasFirstSampleFlags = Boolean(versionFlags & 0x4);
    const firstSampleFlags = hasFirstSampleFlags ? bFull.readUInt32BE(ptr) : 0;
    if (hasFirstSampleFlags) ptr += 4;

    const hasDuration = Boolean(versionFlags & 0x100);
    const hasSize = Boolean(versionFlags & 0x200);
    const hasFlags = Boolean(versionFlags & 0x400);
    const hasCto = Boolean(versionFlags & 0x800);

    const rawDurations = new Uint32Array(sampleCount);
    const sizes = new Uint32Array(sampleCount);
    const keyframes: number[] = [];
    let rawTotalDuration = 0;

    for (let i = 0; i < sampleCount; i++) {
      const dur = hasDuration ? bFull.readUInt32BE(ptr) : defaultSampleDuration;
      if (hasDuration) ptr += 4;
      const sz = hasSize ? bFull.readUInt32BE(ptr) : defaultSampleSize;
      if (hasSize) ptr += 4;
      const flg = hasFlags
        ? bFull.readUInt32BE(ptr)
        : i === 0 && hasFirstSampleFlags
          ? firstSampleFlags
          : i === 0
            ? 0
            : defaultSampleFlags;
      if (hasFlags) ptr += 4;
      if (hasCto) ptr += 4;

      rawDurations[i] = dur;
      sizes[i] = sz;
      rawTotalDuration += dur;
      if ((flg & 0x00010000) === 0) {
        keyframes.push(i + 1);
      }
    }

    const moov18 = findMp4Box(b18, "moov");
    const mdat18 = findMp4Box(b18, "mdat");
    if (!moov18 || !mdat18) return null;
    const mvhd18 = findMp4Box(b18, "mvhd", moov18.dataOffset, moov18.end);
    if (!mvhd18) return null;

    const mvhdVer18 = b18.readUInt8(mvhd18.dataOffset);
    const mvhdTimescale18 = b18.readUInt32BE(
      mvhd18.dataOffset + (mvhdVer18 === 1 ? 20 : 12),
    );
    const mvhdDuration18 =
      mvhdVer18 === 1
        ? Number(b18.readBigUInt64BE(mvhd18.dataOffset + 28))
        : b18.readUInt32BE(mvhd18.dataOffset + 16);

    const traks18 = findAllMp4Boxes(b18, "trak", moov18.dataOffset, moov18.end);
    let videTrak18: Mp4BoxSlice | undefined;
    let sounTrak18: Mp4BoxSlice | undefined;

    for (const t of traks18) {
      const mdia = findMp4Box(b18, "mdia", t.dataOffset, t.end);
      if (!mdia) continue;
      const hdlr = findMp4Box(b18, "hdlr", mdia.dataOffset, mdia.end);
      if (!hdlr) continue;
      const hType = b18
        .subarray(hdlr.dataOffset + 8, hdlr.dataOffset + 12)
        .toString("ascii");
      if (hType === "vide") videTrak18 = t;
      else if (hType === "soun") sounTrak18 = t;
    }

    if (!sounTrak18) return null;

    let videTkhdDuration = mvhdDuration18;
    let exactVideoDurationSeconds =
      mvhdTimescale18 > 0 ? mvhdDuration18 / mvhdTimescale18 : 0;

    if (videTrak18) {
      const tkhd18 = findMp4Box(
        b18,
        "tkhd",
        videTrak18.dataOffset,
        videTrak18.end,
      );
      if (tkhd18) {
        videTkhdDuration = b18.readUInt32BE(tkhd18.dataOffset + 20);
      }
      const mdia18 = findMp4Box(
        b18,
        "mdia",
        videTrak18.dataOffset,
        videTrak18.end,
      );
      const mdhd18 =
        mdia18 && findMp4Box(b18, "mdhd", mdia18.dataOffset, mdia18.end);
      if (mdhd18) {
        const ver18 = b18.readUInt8(mdhd18.dataOffset);
        const ts18 = b18.readUInt32BE(
          mdhd18.dataOffset + (ver18 === 1 ? 20 : 12),
        );
        const dur18 =
          ver18 === 1
            ? Number(b18.readBigUInt64BE(mdhd18.dataOffset + 24))
            : b18.readUInt32BE(mdhd18.dataOffset + 16);
        if (ts18 > 0 && dur18 > 0) {
          exactVideoDurationSeconds = dur18 / ts18;
        }
      }
    }

    const TARGET_VIDEO_TIMESCALE = 90000;
    const targetTotalTicks =
      exactVideoDurationSeconds > 0
        ? Math.round(exactVideoDurationSeconds * TARGET_VIDEO_TIMESCALE)
        : Math.round((rawTotalDuration / 1000) * TARGET_VIDEO_TIMESCALE);

    const durations = new Uint32Array(sampleCount);
    let cumRaw = 0;
    let cumTarget = 0;
    for (let i = 0; i < sampleCount; i++) {
      cumRaw += rawDurations[i];
      const nextTarget =
        rawTotalDuration > 0
          ? Math.round((cumRaw / rawTotalDuration) * targetTotalTicks)
          : Math.round(((i + 1) / sampleCount) * targetTotalTicks);
      const sampleTicks = Math.max(1, nextTarget - cumTarget);
      durations[i] = sampleTicks;
      cumTarget += sampleTicks;
    }
    const totalVideoMdhdDuration = cumTarget;

    const sttsRuns: Array<[number, number]> = [];
    for (let i = 0; i < sampleCount; i++) {
      const d = durations[i];
      if (sttsRuns.length > 0 && sttsRuns[sttsRuns.length - 1][1] === d) {
        sttsRuns[sttsRuns.length - 1][0]++;
      } else {
        sttsRuns.push([1, d]);
      }
    }
    const sttsPayload = Buffer.allocUnsafe(8 + sttsRuns.length * 8);
    sttsPayload.writeUInt32BE(0, 0);
    sttsPayload.writeUInt32BE(sttsRuns.length, 4);
    for (let i = 0; i < sttsRuns.length; i++) {
      sttsPayload.writeUInt32BE(sttsRuns[i][0], 8 + i * 8);
      sttsPayload.writeUInt32BE(sttsRuns[i][1], 12 + i * 8);
    }
    const sttsBox = makeMp4Box("stts", [sttsPayload]);

    const stscPayload = Buffer.allocUnsafe(20);
    stscPayload.writeUInt32BE(0, 0);
    stscPayload.writeUInt32BE(1, 4);
    stscPayload.writeUInt32BE(1, 8);
    stscPayload.writeUInt32BE(1, 12);
    stscPayload.writeUInt32BE(1, 16);
    const stscBox = makeMp4Box("stsc", [stscPayload]);

    const stszPayload = Buffer.allocUnsafe(12 + sampleCount * 4);
    stszPayload.writeUInt32BE(0, 0);
    stszPayload.writeUInt32BE(0, 4);
    stszPayload.writeUInt32BE(sampleCount, 8);
    for (let i = 0; i < sampleCount; i++) {
      stszPayload.writeUInt32BE(sizes[i], 12 + i * 4);
    }
    const stszBox = makeMp4Box("stsz", [stszPayload]);

    const stssPayload = Buffer.allocUnsafe(8 + keyframes.length * 4);
    stssPayload.writeUInt32BE(0, 0);
    stssPayload.writeUInt32BE(keyframes.length, 4);
    for (let i = 0; i < keyframes.length; i++) {
      stssPayload.writeUInt32BE(keyframes[i], 8 + i * 4);
    }
    const stssBox = makeMp4Box("stss", [stssPayload]);

    const stcoPayload = Buffer.allocUnsafe(8 + sampleCount * 4);
    stcoPayload.writeUInt32BE(0, 0);
    stcoPayload.writeUInt32BE(sampleCount, 4);
    const stcoBox = makeMp4Box("stco", [stcoPayload]);

    const moovMap = findMp4Box(bMap, "moov");
    if (!moovMap) return null;
    const trakMap = findMp4Box(bMap, "trak", moovMap.dataOffset, moovMap.end);
    if (!trakMap) return null;
    const tkhdMap = findMp4Box(bMap, "tkhd", trakMap.dataOffset, trakMap.end);
    const mdiaMap = findMp4Box(bMap, "mdia", trakMap.dataOffset, trakMap.end);
    if (!tkhdMap || !mdiaMap) return null;
    const mdhdMap = findMp4Box(bMap, "mdhd", mdiaMap.dataOffset, mdiaMap.end);
    const hdlrMap = findMp4Box(bMap, "hdlr", mdiaMap.dataOffset, mdiaMap.end);
    const minfMap = findMp4Box(bMap, "minf", mdiaMap.dataOffset, mdiaMap.end);
    if (!mdhdMap || !hdlrMap || !minfMap) return null;
    const vmhdMap = findMp4Box(bMap, "vmhd", minfMap.dataOffset, minfMap.end);
    const dinfMap = findMp4Box(bMap, "dinf", minfMap.dataOffset, minfMap.end);
    const stblMap = findMp4Box(bMap, "stbl", minfMap.dataOffset, minfMap.end);
    if (!vmhdMap || !dinfMap || !stblMap) return null;
    const stsdMap = findMp4Box(bMap, "stsd", stblMap.dataOffset, stblMap.end);
    if (!stsdMap) return null;

    const tkhdBuf = Buffer.from(bMap.subarray(tkhdMap.offset, tkhdMap.end));
    const tkhdVer = tkhdBuf.readUInt8(8);
    tkhdBuf.writeUInt32BE((tkhdVer << 24) | 0x000003, 8);
    if (tkhdVer === 0) {
      tkhdBuf.writeUInt32BE(1, 8 + 12);
      tkhdBuf.writeUInt32BE(videTkhdDuration, 8 + 20);
    }

    const mdhdBuf = Buffer.from(bMap.subarray(mdhdMap.offset, mdhdMap.end));
    const mdhdVer = mdhdBuf.readUInt8(8);
    if (mdhdVer === 0) {
      mdhdBuf.writeUInt32BE(TARGET_VIDEO_TIMESCALE, 8 + 12);
      mdhdBuf.writeUInt32BE(totalVideoMdhdDuration, 8 + 16);
    } else {
      mdhdBuf.writeUInt32BE(TARGET_VIDEO_TIMESCALE, 8 + 20);
      mdhdBuf.writeBigUInt64BE(BigInt(totalVideoMdhdDuration), 8 + 24);
    }

    const stblBox = makeMp4Box("stbl", [
      bMap.subarray(stsdMap.offset, stsdMap.end),
      sttsBox,
      stscBox,
      stszBox,
      stssBox,
      stcoBox,
    ]);
    const minfBox = makeMp4Box("minf", [
      bMap.subarray(vmhdMap.offset, vmhdMap.end),
      bMap.subarray(dinfMap.offset, dinfMap.end),
      stblBox,
    ]);
    const mdiaBox = makeMp4Box("mdia", [
      mdhdBuf,
      bMap.subarray(hdlrMap.offset, hdlrMap.end),
      minfBox,
    ]);
    const videTrakBox = makeMp4Box("trak", [tkhdBuf, mdiaBox]);

    const sounTrakBuf = Buffer.from(
      b18.subarray(sounTrak18.offset, sounTrak18.end),
    );
    const mvhdBuf = b18.subarray(mvhd18.offset, mvhd18.end);

    const ftypPayload = Buffer.from(
      "isom\x00\x00\x02\x00isomiso2iso6mp41mp42",
      "ascii",
    );
    const ftypBuf = makeMp4Box("ftyp", [ftypPayload]);

    const newMoovSize =
      8 + mvhdBuf.length + videTrakBox.length + sounTrakBuf.length;
    const newMdatHeaderOffset = ftypBuf.length + newMoovSize;
    const newMdatPayloadOffset = newMdatHeaderOffset + 8;

    const audioShift = newMdatPayloadOffset - mdat18.dataOffset;
    const sounMdia = findMp4Box(sounTrakBuf, "mdia", 8, sounTrakBuf.length);
    const sounMinf =
      sounMdia &&
      findMp4Box(sounTrakBuf, "minf", sounMdia.dataOffset, sounMdia.end);
    const sounStbl =
      sounMinf &&
      findMp4Box(sounTrakBuf, "stbl", sounMinf.dataOffset, sounMinf.end);
    const sounStco =
      sounStbl &&
      findMp4Box(sounTrakBuf, "stco", sounStbl.dataOffset, sounStbl.end);
    if (!sounStco) return null;

    const sounChunkCount = sounTrakBuf.readUInt32BE(sounStco.dataOffset + 4);
    for (let i = 0; i < sounChunkCount; i++) {
      const pos = sounStco.dataOffset + 8 + i * 4;
      const oldOff = sounTrakBuf.readUInt32BE(pos);
      sounTrakBuf.writeUInt32BE(oldOff + audioShift, pos);
    }

    const b18MdatPayloadLen = mdat18.size - 8;
    let videoSampleOffset = newMdatPayloadOffset + b18MdatPayloadLen;
    const videMdia = findMp4Box(videTrakBox, "mdia", 8, videTrakBox.length);
    const videMinf =
      videMdia &&
      findMp4Box(videTrakBox, "minf", videMdia.dataOffset, videMdia.end);
    const videStbl =
      videMinf &&
      findMp4Box(videTrakBox, "stbl", videMinf.dataOffset, videMinf.end);
    const videStco =
      videStbl &&
      findMp4Box(videTrakBox, "stco", videStbl.dataOffset, videStbl.end);
    if (!videStco) return null;

    for (let i = 0; i < sampleCount; i++) {
      videTrakBox.writeUInt32BE(
        videoSampleOffset,
        videStco.dataOffset + 8 + i * 4,
      );
      videoSampleOffset += sizes[i];
    }

    const moovBox = makeMp4Box("moov", [mvhdBuf, videTrakBox, sounTrakBuf]);
    const videoMdatPayloadLen = mdatVideo.size - 8;
    const mdatHeader = Buffer.allocUnsafe(8);
    mdatHeader.writeUInt32BE(8 + b18MdatPayloadLen + videoMdatPayloadLen, 0);
    mdatHeader.write("mdat", 4, 4, "ascii");

    const combined = Buffer.concat([
      ftypBuf,
      moovBox,
      mdatHeader,
      b18.subarray(mdat18.dataOffset, mdat18.end),
      bFull.subarray(mdatVideo.dataOffset, mdatVideo.end),
    ]);

    return new Uint8Array(
      combined.buffer,
      combined.byteOffset,
      combined.byteLength,
    );
  } catch {
    return null;
  }
}

async function extractVisionOsFmp4Video(
  videoId: string,
  audioMuxCandidate?: ResolvedStreamCandidate | null,
  preFetchedHlsManifestUrl?: string | null,
): Promise<{
  candidate: ResolvedStreamCandidate;
  isSingleFileMuxedWithAudio: boolean;
} | null> {
  try {
    let hlsManifestUrl = preFetchedHlsManifestUrl || null;

    if (!hlsManifestUrl) {
      const visitorData = await getVisitorData(videoId);
      if (!visitorData) return null;

      const playerRes = await fetch(
        "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": VISIONOS_USER_AGENT,
            "X-Goog-Visitor-Id": visitorData,
          },
          body: JSON.stringify({
            videoId,
            context: {
              client: {
                clientName: "VISIONOS",
                clientVersion: "0.1",
                deviceMake: "Apple",
                deviceModel: "RealityDevice14,1",
                osName: "visionOS",
                osVersion: "1.3.21O771",
                hl: "en",
                gl: "US",
                visitorData,
              },
            },
            contentCheckOk: true,
            racyCheckOk: true,
          }),
          cache: "no-store",
        },
      );

      if (!playerRes.ok) return null;
      const playerData = await playerRes.json();
      hlsManifestUrl = playerData?.streamingData?.hlsManifestUrl || null;
    }

    if (!hlsManifestUrl) return null;

    const masterM3u8 = await fetch(hlsManifestUrl, {
      headers: { "User-Agent": VISIONOS_USER_AGENT },
      cache: "no-store",
    }).then((r) => r.text());

    const lines = masterM3u8.split("\n").map((l) => l.trim());
    interface HlsVariant {
      bandwidth: number;
      height: number;
      playlistUrl: string;
      tier: number;
      width: number;
    }

    const fmp4Variants: HlsVariant[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith("#EXT-X-STREAM-INF:")) continue;
      const nextLine = lines[i + 1];
      if (!nextLine || !nextLine.startsWith("http")) continue;
      if (!line.includes("vp09") && !nextLine.includes("/wft/1/")) continue;

      const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
      const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
      const width = resMatch ? parseInt(resMatch[1], 10) : 0;
      const height = resMatch ? parseInt(resMatch[2], 10) : 0;
      const tier = parseQualityHeight("", height, width);

      if (tier === 1080 || tier === 720) {
        fmp4Variants.push({
          bandwidth: bwMatch ? parseInt(bwMatch[1], 10) : 0,
          height,
          playlistUrl: nextLine,
          tier,
          width,
        });
      }
    }

    const chosen =
      fmp4Variants
        .filter((v) => v.tier === 1080)
        .sort((a, b) => b.bandwidth - a.bandwidth)[0] ||
      fmp4Variants
        .filter((v) => v.tier === 720)
        .sort((a, b) => b.bandwidth - a.bandwidth)[0];

    if (!chosen) return null;

    const subM3u8 = await fetch(chosen.playlistUrl, {
      headers: { "User-Agent": VISIONOS_USER_AGENT },
      cache: "no-store",
    }).then((r) => r.text());

    const mapMatch = subM3u8.match(/#EXT-X-MAP:URI="([^"]+)"/);
    if (!mapMatch) return null;

    const initUrl = mapMatch[1];
    const clenMatch = initUrl.match(/clen%3D(\d+)/i);
    const clen = clenMatch ? parseInt(clenMatch[1], 10) : 0;
    if (clen <= 0) return null;

    const baseGovp = initUrl.split("/govp/")[0];
    const fullSliceUrl = `${baseGovp}/govp/slices%3D0-${clen - 1}/gosq/0/file/seg.ts`;

    const [initRes, fullRes, audioBufferEntry] = await Promise.all([
      fetch(initUrl, {
        headers: { "User-Agent": VISIONOS_USER_AGENT },
        cache: "no-store",
      }),
      fetch(fullSliceUrl, {
        headers: { "User-Agent": VISIONOS_USER_AGENT },
        cache: "no-store",
      }),
      audioMuxCandidate
        ? getOrDownloadFullMediaBuffer(`itag18:${videoId}`, audioMuxCandidate)
        : Promise.resolve(null),
    ]);

    if (!initRes.ok || !fullRes.ok) return null;

    const [initAb, fullAb] = await Promise.all([
      initRes.arrayBuffer(),
      fullRes.arrayBuffer(),
    ]);

    const bMap = Buffer.from(initAb);
    const bFull = Buffer.from(fullAb);
    if (bMap.byteLength === 0 || bFull.byteLength === 0) return null;

    let finalBuffer: Uint8Array | null = null;
    let isSingleFileMuxedWithAudio = false;

    if (audioBufferEntry && audioBufferEntry.buffer.byteLength > 0) {
      const b18 = Buffer.from(
        audioBufferEntry.buffer.buffer,
        audioBufferEntry.buffer.byteOffset,
        audioBufferEntry.buffer.byteLength,
      );
      const remuxed = remuxVisionOsWithItag18Audio(bMap, bFull, b18);
      if (remuxed && remuxed.byteLength > 0) {
        finalBuffer = remuxed;
        isSingleFileMuxedWithAudio = true;
      }
    }

    if (!finalBuffer) {
      const combined = new Uint8Array(bMap.byteLength + bFull.byteLength);
      combined.set(new Uint8Array(bMap), 0);
      combined.set(new Uint8Array(bFull), bMap.byteLength);
      finalBuffer = combined;
    }

    const cacheEntry: CachedMediaBuffer = {
      buffer: finalBuffer,
      expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
      mimeType: "video/mp4",
    };

    if (mediaBufferCache.size >= MAX_BUFFER_CACHE_ENTRIES) {
      const oldestKey = mediaBufferCache.keys().next().value;
      if (oldestKey) mediaBufferCache.delete(oldestKey);
    }

    mediaBufferCache.set(`video:${videoId}`, cacheEntry);
    if (isSingleFileMuxedWithAudio) {
      mediaBufferCache.set(`muxed:${videoId}`, cacheEntry);
    }

    return {
      candidate: {
        clientPriority: 15,
        codec: "vp9",
        contentLength: finalBuffer.byteLength,
        fps: 24,
        height: chosen.tier,
        itag: chosen.tier === 1080 ? 614 : 609,
        mimeType: "video/mp4",
        qualityLabel: `${chosen.tier}p`,
        url: `visionos-fmp4://${videoId}/${chosen.tier}p`,
        userAgent: VISIONOS_USER_AGENT,
        width: chosen.width,
      },
      isSingleFileMuxedWithAudio,
    };
  } catch {
    return null;
  }
}

async function fetchInnertubePlayer(
  videoId: string,
  clientType: "ANDROID" | "ANDROID_VR" | "IOS",
): Promise<{
  adaptiveFormats: InnertubeFormat[];
  author?: string;
  durationSeconds?: number;
  formats: InnertubeFormat[];
  hlsManifestUrl?: string | null;
  title?: string;
  userAgent: string;
} | null> {
  const isAndroid = clientType === "ANDROID";
  const isIos = clientType === "IOS";
  const userAgent = isAndroid
    ? ANDROID_USER_AGENT
    : isIos
      ? IOS_USER_AGENT
      : ANDROID_VR_USER_AGENT;
  const clientPriority = isAndroid ? 8 : isIos ? 1 : 10;

  const contextClient = isAndroid
    ? {
        androidSdkVersion: 34,
        clientName: "ANDROID",
        clientVersion: "20.10.38",
        gl: "US",
        hl: "en",
        osName: "Android",
        osVersion: "14",
      }
    : isIos
      ? {
          clientName: "IOS",
          clientVersion: "20.10.4",
          deviceMake: "Apple",
          deviceModel: "iPhone16,2",
          gl: "US",
          hl: "en",
          osName: "iPhone",
          osVersion: "18.3.2.22D82",
        }
      : {
          androidSdkVersion: 32,
          clientName: "ANDROID_VR",
          clientVersion: "1.60.19",
          gl: "US",
          hl: "en",
          osName: "Android",
          osVersion: "12L",
        };

  try {
    const response = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": userAgent,
        },
        body: JSON.stringify({
          videoId,
          context: {
            client: contextClient,
          },
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) return null;
    const data = await response.json();
    if (data?.playabilityStatus?.status !== "OK" && !data?.streamingData) {
      return null;
    }

    const formats: InnertubeFormat[] = (
      data?.streamingData?.formats || []
    ).map((f: InnertubeFormat) => ({
      ...f,
      _clientPriority: clientPriority,
      _clientUserAgent: userAgent,
    }));
    const adaptiveFormats: InnertubeFormat[] = (
      data?.streamingData?.adaptiveFormats || []
    ).map((f: InnertubeFormat) => ({
      ...f,
      _clientPriority: clientPriority,
      _clientUserAgent: userAgent,
    }));

    return {
      adaptiveFormats,
      author: data?.videoDetails?.author || "",
      durationSeconds: Number(data?.videoDetails?.lengthSeconds) || 0,
      formats,
      hlsManifestUrl: data?.streamingData?.hlsManifestUrl || null,
      title: data?.videoDetails?.title || "",
      userAgent,
    };
  } catch {
    return null;
  }
}

async function isCandidateSeekableToEnd(
  candidate: ResolvedStreamCandidate | undefined,
): Promise<boolean> {
  if (!candidate || candidate.contentLength <= 65536) return false;
  try {
    const probeStart = candidate.contentLength - 16;
    const probeEnd = candidate.contentLength - 1;
    const res = await fetch(candidate.url, {
      headers: {
        "User-Agent": candidate.userAgent,
        Range: `bytes=${probeStart}-${probeEnd}`,
      },
      cache: "no-store",
    });
    res.body?.cancel();
    return res.status === 206;
  } catch {
    return false;
  }
}

const pendingResolutions = new Map<string, Promise<CachedYouTubeData | null>>();

async function resolveYouTubeData(
  videoId: string,
): Promise<CachedYouTubeData | null> {
  const now = Date.now();
  const cached = streamCache.get(videoId);
  if (cached && cached.expiresAt > now) {
    return cached;
  }

  const inflight = pendingResolutions.get(videoId);
  if (inflight) {
    return inflight;
  }

  const resolutionPromise = (async (): Promise<CachedYouTubeData | null> => {
    try {
      const [vrResult, androidResult, iosResult] = await Promise.all([
        fetchInnertubePlayer(videoId, "ANDROID_VR"),
        fetchInnertubePlayer(videoId, "ANDROID"),
        fetchInnertubePlayer(videoId, "IOS"),
      ]);

      if (!vrResult && !androidResult && !iosResult) {
        return null;
      }

      const combinedAdaptive: InnertubeFormat[] = [
        ...(vrResult?.adaptiveFormats || []),
        ...(androidResult?.adaptiveFormats || []),
        ...(iosResult?.adaptiveFormats || []),
      ];
      const combinedMuxed: InnertubeFormat[] = [
        ...(androidResult?.formats || []),
        ...(vrResult?.formats || []),
        ...(iosResult?.formats || []),
      ];

      let videoStreams: ResolvedStreamCandidate[] = [];
      let audioStreams: ResolvedStreamCandidate[] = [];
      const muxedStreams: ResolvedStreamCandidate[] = [];

      const seenVideoKey = new Set<string>();
      const seenAudioKey = new Set<string>();

      for (const fmt of combinedAdaptive) {
        const candidate = normalizeCandidate(
          fmt,
          fmt._clientUserAgent || ANDROID_USER_AGENT,
        );
        if (!candidate) continue;

        if (candidate.mimeType.startsWith("video/")) {
          if (candidate.height !== 1080 && candidate.height !== 720) {
            continue;
          }
          const key = `${candidate.itag}-${candidate.height}-${candidate.codec}`;
          if (!seenVideoKey.has(key)) {
            seenVideoKey.add(key);
            videoStreams.push(candidate);
          }
        } else if (candidate.mimeType.startsWith("audio/")) {
          const key = `${candidate.itag}-${candidate.mimeType}`;
          if (!seenAudioKey.has(key)) {
            seenAudioKey.add(key);
            audioStreams.push(candidate);
          }
        }
      }

      for (const fmt of combinedMuxed) {
        const candidate = normalizeCandidate(
          fmt,
          fmt._clientUserAgent || ANDROID_USER_AGENT,
        );
        if (candidate && candidate.mimeType.startsWith("video/")) {
          muxedStreams.push(candidate);
        }
      }

      videoStreams.sort((a, b) => {
        if (b.clientPriority !== a.clientPriority) {
          return b.clientPriority - a.clientPriority;
        }
        if (b.height !== a.height) return b.height - a.height;
        const codecScore = (c: ResolvedStreamCandidate["codec"]) => {
          if (c === "h264") return 5;
          if (c === "hevc") return 4;
          if (c === "av1") return 3;
          if (c === "vp9") return 2;
          return 1;
        };
        return codecScore(b.codec) - codecScore(a.codec);
      });

      audioStreams.sort((a, b) => {
        if (b.clientPriority !== a.clientPriority) {
          return b.clientPriority - a.clientPriority;
        }
        const isMp4A = a.mimeType === "audio/mp4" ? 1 : 0;
        const isMp4B = b.mimeType === "audio/mp4" ? 1 : 0;
        if (isMp4B !== isMp4A) return isMp4B - isMp4A;
        return b.contentLength - a.contentLength;
      });

      muxedStreams.sort((a, b) => b.height - a.height);

      let usingMuxedForVideo = false;
      const visionResult = await extractVisionOsFmp4Video(
        videoId,
        muxedStreams[0] || null,
      );

      if (visionResult) {
        videoStreams = [visionResult.candidate];
        if (visionResult.isSingleFileMuxedWithAudio) {
          usingMuxedForVideo = true;
          muxedStreams.unshift(visionResult.candidate);
        }
      }

      if (!usingMuxedForVideo) {
        const hasUnrestrictedVrAdaptive = Boolean(
          vrResult?.adaptiveFormats?.length &&
            videoStreams.some((v) => v.clientPriority === 10),
        );
        if (!hasUnrestrictedVrAdaptive && muxedStreams.length > 0) {
          audioStreams = [...muxedStreams];
        }
        if (audioStreams[0]) {
          await getOrDownloadFullMediaBuffer(
            `audio:${videoId}`,
            audioStreams[0],
          );
        }
      }

      const primaryMeta = vrResult || androidResult || iosResult;

      const resolved: CachedYouTubeData = {
        audioStreams,
        author: primaryMeta?.author || "",
        durationSeconds: primaryMeta?.durationSeconds || 0,
        expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
        hlsManifestUrl:
          iosResult?.hlsManifestUrl ||
          androidResult?.hlsManifestUrl ||
          vrResult?.hlsManifestUrl ||
          null,
        muxedStreams,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
        title: primaryMeta?.title || "",
        usingMuxedForVideo,
        videoId,
        videoStreams,
      };

      streamCache.set(videoId, resolved);
      return resolved;
    } finally {
      pendingResolutions.delete(videoId);
    }
  })();

  pendingResolutions.set(videoId, resolutionPromise);
  return resolutionPromise;
}

function selectBestVideoCandidate(
  data: CachedYouTubeData,
  _targetQuality = "1080p",
  preferredCodec = "auto",
): ResolvedStreamCandidate | null {
  const candidates = data.videoStreams;
  if (!candidates.length) {
    return null;
  }

  const tier1080 = candidates.filter((c) => c.height === 1080);
  const tier720 = candidates.filter((c) => c.height === 720);
  const pool =
    tier1080.length > 0 ? tier1080 : tier720.length > 0 ? tier720 : candidates;

  const scoreCandidate = (c: ResolvedStreamCandidate): number => {
    let score = c.clientPriority * 500;

    if (c.height === 1080) score += 2000;
    else if (c.height === 720) score += 1000;

    if (preferredCodec && preferredCodec !== "auto") {
      if (c.codec === preferredCodec.toLowerCase()) {
        score += 500;
      }
    } else {
      if (c.codec === "h264") score += 240;
      else if (c.codec === "hevc") score += 220;
      else if (c.codec === "av1") score += 180;
      else if (c.codec === "vp9") score += 150;
    }

    if (c.mimeType === "video/mp4") score += 60;
    if (c.fps >= 60) score += 20;

    return score;
  };

  return (
    [...pool].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0] || null
  );
}

async function serveThumbnail(videoId: string): Promise<Response> {
  const qualities = ["maxresdefault.jpg", "sddefault.jpg", "hqdefault.jpg"];
  for (const variant of qualities) {
    try {
      const res = await fetch(`https://i.ytimg.com/vi/${videoId}/${variant}`);
      if (res.ok && res.body) {
        return new Response(res.body, {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "Content-Type": res.headers.get("content-type") || "image/jpeg",
          },
        });
      }
    } catch {}
  }
  return new Response("Thumbnail not found", { status: 404 });
}

async function getOrDownloadFullMediaBuffer(
  cacheKey: string,
  candidate: ResolvedStreamCandidate,
): Promise<CachedMediaBuffer | null> {
  const now = Date.now();
  const existing = mediaBufferCache.get(cacheKey);
  if (existing && existing.expiresAt > now) {
    return existing;
  }

  const inflight = pendingBufferDownloads.get(cacheKey);
  if (inflight) return inflight;

  const downloadPromise = (async (): Promise<CachedMediaBuffer | null> => {
    try {
      let totalSize = candidate.contentLength;

      if (totalSize > 30 * 1024 * 1024) {
        return null;
      }

      const initialOpenRes = await fetch(candidate.url, {
        headers: {
          "User-Agent": candidate.userAgent,
          Range: "bytes=0-",
        },
        cache: "no-store",
      });

      if (initialOpenRes.ok || initialOpenRes.status === 206) {
        const initialBytes = new Uint8Array(await initialOpenRes.arrayBuffer());
        if (
          initialBytes.byteLength > 0 &&
          (totalSize <= 0 || initialBytes.byteLength >= totalSize)
        ) {
          if (mediaBufferCache.size >= MAX_BUFFER_CACHE_ENTRIES) {
            const oldestKey = mediaBufferCache.keys().next().value;
            if (oldestKey) mediaBufferCache.delete(oldestKey);
          }

          const entry: CachedMediaBuffer = {
            buffer: initialBytes,
            expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
            mimeType: candidate.mimeType,
          };
          mediaBufferCache.set(cacheKey, entry);
          return entry;
        }

        if (totalSize > 0 && initialBytes.byteLength > 0) {
          const fullBuffer = new Uint8Array(totalSize);
          fullBuffer.set(
            initialBytes.subarray(0, Math.min(initialBytes.byteLength, totalSize)),
            0,
          );
          let offset = initialBytes.byteLength;

          while (offset < totalSize) {
            const sliceEnd = Math.min(
              totalSize - 1,
              offset + UPSTREAM_SLICE_BYTES - 1,
            );
            const res = await fetch(candidate.url, {
              headers: {
                "User-Agent": candidate.userAgent,
                Range: `bytes=${offset}-${sliceEnd}`,
              },
              cache: "no-store",
            });

            if (!res.ok && res.status !== 206) {
              return null;
            }

            const chunk = new Uint8Array(await res.arrayBuffer());
            if (chunk.byteLength === 0) break;

            fullBuffer.set(
              chunk.subarray(0, Math.min(chunk.byteLength, totalSize - offset)),
              offset,
            );
            offset += chunk.byteLength;
          }

          if (offset >= totalSize) {
            if (mediaBufferCache.size >= MAX_BUFFER_CACHE_ENTRIES) {
              const oldestKey = mediaBufferCache.keys().next().value;
              if (oldestKey) mediaBufferCache.delete(oldestKey);
            }

            const entry: CachedMediaBuffer = {
              buffer: fullBuffer,
              expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
              mimeType: candidate.mimeType,
            };
            mediaBufferCache.set(cacheKey, entry);
            return entry;
          }
        }
      }

      if (totalSize <= 0) {
        return null;
      }

      const fullBuffer = new Uint8Array(totalSize);
      let offset = 0;

      while (offset < totalSize) {
        const sliceEnd = Math.min(
          totalSize - 1,
          offset + UPSTREAM_SLICE_BYTES - 1,
        );
        const res = await fetch(candidate.url, {
          headers: {
            "User-Agent": candidate.userAgent,
            Range: `bytes=${offset}-${sliceEnd}`,
          },
          cache: "no-store",
        });

        if (!res.ok && res.status !== 206) {
          return null;
        }

        const chunk = new Uint8Array(await res.arrayBuffer());
        if (chunk.byteLength === 0) break;

        fullBuffer.set(
          chunk.subarray(0, Math.min(chunk.byteLength, totalSize - offset)),
          offset,
        );
        offset += chunk.byteLength;
      }

      if (offset < totalSize) {
        return null;
      }

      if (mediaBufferCache.size >= MAX_BUFFER_CACHE_ENTRIES) {
        const oldestKey = mediaBufferCache.keys().next().value;
        if (oldestKey) mediaBufferCache.delete(oldestKey);
      }

      const entry: CachedMediaBuffer = {
        buffer: fullBuffer,
        expiresAt: Date.now() + STREAM_CACHE_TTL_MS,
        mimeType: candidate.mimeType,
      };
      mediaBufferCache.set(cacheKey, entry);
      return entry;
    } catch {
      return null;
    } finally {
      pendingBufferDownloads.delete(cacheKey);
    }
  })();

  pendingBufferDownloads.set(cacheKey, downloadPromise);
  return downloadPromise;
}

async function serveBufferedMediaStream(
  request: Request,
  cacheKey: string,
  candidate: ResolvedStreamCandidate,
): Promise<Response> {
  const cachedMedia = await getOrDownloadFullMediaBuffer(cacheKey, candidate);
  if (cachedMedia) {
    const totalSize = cachedMedia.buffer.byteLength;
    const rangeHeader = request.headers.get("range");
    let start = 0;
    let end = totalSize - 1;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        start = parseInt(match[1], 10);
        if (match[2]) {
          end = Math.min(totalSize - 1, parseInt(match[2], 10));
        }
      }
    }

    if (start >= totalSize || start > end) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }

    const slice = cachedMedia.buffer.subarray(start, end + 1);
    return new Response(request.method === "HEAD" ? null : Buffer.from(slice), {
      status: rangeHeader ? 206 : 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(slice.byteLength),
        "Content-Range": `bytes ${start}-${end}/${totalSize}`,
        "Content-Type": cachedMedia.mimeType,
      },
    });
  }

  return proxySlicedMediaStream(request, candidate, UPSTREAM_SLICE_BYTES);
}

async function proxySlicedMediaStream(
  request: Request,
  candidate: ResolvedStreamCandidate,
  maxWindowBytes: number,
): Promise<Response> {
  const rangeHeader = request.headers.get("range");
  const totalSize = candidate.contentLength;

  let start = 0;
  let end =
    totalSize > 0
      ? Math.min(totalSize - 1, maxWindowBytes - 1)
      : maxWindowBytes - 1;

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      start = parseInt(match[1], 10);
      if (match[2]) {
        const requestedEnd = parseInt(match[2], 10);
        end =
          totalSize > 0
            ? Math.min(totalSize - 1, requestedEnd, start + maxWindowBytes - 1)
            : Math.min(requestedEnd, start + maxWindowBytes - 1);
      } else if (totalSize > 0) {
        end = Math.min(totalSize - 1, start + maxWindowBytes - 1);
      } else {
        end = start + maxWindowBytes - 1;
      }
    }
  }

  if (totalSize > 0 && (start >= totalSize || start > end)) {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${totalSize}`,
      },
    });
  }

  const responseLength = end - start + 1;
  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", candidate.mimeType);
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Cache-Control", "private, max-age=3600");
  responseHeaders.set("Content-Length", String(responseLength));
  if (totalSize > 0) {
    responseHeaders.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
  }

  if (request.method === "HEAD") {
    return new Response(null, { status: 206, headers: responseHeaders });
  }

  const firstSliceEnd = Math.min(end, start + UPSTREAM_SLICE_BYTES - 1);
  const firstUpstream = await fetch(candidate.url, {
    headers: {
      "User-Agent": candidate.userAgent,
      Range: `bytes=${start}-${firstSliceEnd}`,
    },
    cache: "no-store",
  });

  if (!firstUpstream.ok && firstUpstream.status !== 206) {
    return new Response(`Upstream stream error: ${firstUpstream.status}`, {
      status: firstUpstream.status,
    });
  }

  let cursor = firstSliceEnd + 1;
  let cancelled = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const firstChunk = new Uint8Array(await firstUpstream.arrayBuffer());
        if (!cancelled && firstChunk.byteLength > 0) {
          controller.enqueue(firstChunk);
        }
        if (cursor > end || firstChunk.byteLength === 0) {
          if (!cancelled) controller.close();
        }
      } catch (err) {
        if (!cancelled) controller.error(err);
      }
    },
    async pull(controller) {
      if (cancelled || cursor > end) {
        if (!cancelled) controller.close();
        return;
      }

      const nextSliceEnd = Math.min(end, cursor + UPSTREAM_SLICE_BYTES - 1);
      try {
        const res = await fetch(candidate.url, {
          headers: {
            "User-Agent": candidate.userAgent,
            Range: `bytes=${cursor}-${nextSliceEnd}`,
          },
          cache: "no-store",
        });

        if (!res.ok && res.status !== 206) {
          controller.close();
          return;
        }

        const chunk = new Uint8Array(await res.arrayBuffer());
        cursor = nextSliceEnd + 1;

        if (!cancelled && chunk.byteLength > 0) {
          controller.enqueue(chunk);
        }

        if (cursor > end || chunk.byteLength === 0) {
          if (!cancelled) controller.close();
        }
      } catch {
        if (!cancelled) controller.close();
      }
    },
    cancel() {
      cancelled = true;
    },
  });

  return new Response(stream, {
    status: 206,
    headers: responseHeaders,
  });
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const rawInput =
    searchParams.get("id") ||
    searchParams.get("url") ||
    searchParams.get("v") ||
    "";
  const streamType = (searchParams.get("stream") || "video").toLowerCase();
  const quality = searchParams.get("quality") || "1080p";
  const codec = searchParams.get("codec") || "auto";

  const videoId = extractVideoId(rawInput);
  if (!videoId) {
    return Response.json(
      { error: "Invalid YouTube video URL or ID" },
      { status: 400 },
    );
  }

  if (streamType === "thumbnail" || streamType === "poster") {
    return serveThumbnail(videoId);
  }

  const resolved = await resolveYouTubeData(videoId);
  if (!resolved) {
    return Response.json(
      { error: "Unable to extract YouTube media streams", videoId },
      { status: 502 },
    );
  }

  if (streamType === "meta" || streamType === "json") {
    const bestVideo = selectBestVideoCandidate(resolved, quality, codec);
    const bestAudio = resolved.audioStreams[0] || null;
    return Response.json(
      {
        author: resolved.author,
        duration: resolved.durationSeconds,
        hasAudioStream: Boolean(bestAudio || resolved.usingMuxedForVideo),
        hasMuxedStream: resolved.muxedStreams.length > 0,
        hasVideoStream: Boolean(bestVideo),
        hlsManifestUrl: resolved.hlsManifestUrl,
        qualities: Array.from(
          new Set(
            (resolved.videoStreams.length
              ? resolved.videoStreams
              : resolved.muxedStreams
            ).map((s) => s.qualityLabel),
          ),
        ),
        selectedVideo: bestVideo
          ? {
              codec: bestVideo.codec,
              fps: bestVideo.fps,
              height: bestVideo.height,
              itag: bestVideo.itag,
              mimeType: bestVideo.mimeType,
              qualityLabel: bestVideo.qualityLabel,
              usingMuxedForVideo: resolved.usingMuxedForVideo,
            }
          : null,
        thumbnailUrl: `/api/background/youtube?id=${videoId}&stream=thumbnail`,
        title: resolved.title,
        videoId,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=600",
        },
      },
    );
  }

  if (streamType === "audio") {
    if (resolved.usingMuxedForVideo) {
      return new Response(null, { status: 204 });
    }

    const audioCandidate = resolved.audioStreams[0] || resolved.muxedStreams[0];
    if (!audioCandidate) {
      return Response.json({ error: "No audio stream found" }, { status: 404 });
    }
    return serveBufferedMediaStream(
      request,
      `audio:${videoId}`,
      audioCandidate,
    );
  }

  if (streamType === "muxed" || resolved.usingMuxedForVideo) {
    const muxedCandidate =
      selectBestVideoCandidate(resolved, quality, codec) ||
      resolved.muxedStreams[0];
    if (!muxedCandidate) {
      return Response.json({ error: "No muxed stream found" }, { status: 404 });
    }
    if (!mediaBufferCache.has(`muxed:${videoId}`)) {
      await extractVisionOsFmp4Video(videoId, resolved.muxedStreams[1] || resolved.muxedStreams[0]);
    }
    return serveBufferedMediaStream(
      request,
      `muxed:${videoId}`,
      muxedCandidate,
    );
  }

  let videoCandidate = selectBestVideoCandidate(resolved, quality, codec);
  if (!videoCandidate) {
    const visionFallback = await extractVisionOsFmp4Video(
      videoId,
      resolved.muxedStreams[0] || null,
    );
    videoCandidate = visionFallback?.candidate || null;
  }
  if (!videoCandidate) {
    return Response.json({ error: "No 1080p/720p video stream found" }, { status: 404 });
  }

  if (
    videoCandidate.url.startsWith("visionos-fmp4://") ||
    mediaBufferCache.has(`video:${videoId}`)
  ) {
    if (!mediaBufferCache.has(`video:${videoId}`)) {
      await extractVisionOsFmp4Video(
        videoId,
        resolved.muxedStreams[0] || null,
      );
    }
    return serveBufferedMediaStream(
      request,
      `video:${videoId}`,
      videoCandidate,
    );
  }

  return proxySlicedMediaStream(
    request,
    videoCandidate,
    MAX_VIDEO_RESPONSE_WINDOW,
  );
}

export async function HEAD(request: Request): Promise<Response> {
  return GET(request);
}
