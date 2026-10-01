import { mediaBufferCache } from "./cache";
import {
  MAX_BUFFER_CACHE_ENTRIES,
  STREAM_CACHE_TTL_MS,
  VISIONOS_USER_AGENT,
} from "./constants";
import { parseQualityHeight } from "./formats";
import { getVisitorData } from "./innertube";
import { getOrDownloadFullMediaBuffer } from "./streaming";
import type {
  CachedMediaBuffer,
  Mp4BoxSlice,
  ResolvedStreamCandidate,
} from "./types";

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

export async function extractVisionOsFmp4Video(
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
