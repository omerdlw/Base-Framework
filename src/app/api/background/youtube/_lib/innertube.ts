import {
  ANDROID_USER_AGENT,
  ANDROID_VR_USER_AGENT,
  IOS_USER_AGENT,
  VISIONOS_USER_AGENT,
  VISITOR_DATA_TTL_MS,
} from "./constants";
import type { InnertubeFormat } from "./types";

let cachedVisitorData: { expiresAt: number; value: string } | null = null;

export async function getVisitorData(videoId: string): Promise<string | null> {
  const now = Date.now();
  if (cachedVisitorData && cachedVisitorData.expiresAt > now) {
    return cachedVisitorData.value;
  }
  try {
    const embedHtml = await fetch(`https://www.youtube.com/embed/${videoId}`, {
      headers: { "User-Agent": VISIONOS_USER_AGENT },
      cache: "no-store",
    }).then((r) => r.text());

    const visitorData = embedHtml.match(/"VISITOR_DATA":"([^"]+)"/)?.[1];
    if (visitorData) {
      cachedVisitorData = {
        expiresAt: now + VISITOR_DATA_TTL_MS,
        value: visitorData,
      };
      return visitorData;
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchInnertubePlayer(
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

    const formats: InnertubeFormat[] = (data?.streamingData?.formats || []).map(
      (f: InnertubeFormat) => ({
        ...f,
        _clientPriority: clientPriority,
        _clientUserAgent: userAgent,
      }),
    );
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
