export interface ParsedUserAgent {
  browser: string;
  device: "desktop" | "mobile" | "tablet";
  deviceLabel: string;
  icon: string;
  os: string;
  title: string;
}

export function parseUserAgent(ua?: string | null): ParsedUserAgent {
  if (!ua || typeof ua !== "string") {
    return {
      browser: "Web browser",
      device: "desktop",
      deviceLabel: "Unknown device",
      icon: "solar:monitor-smartphone-bold",
      os: "Unknown OS",
      title: "Unknown session",
    };
  }

  let browser = "Web browser";
  let os = "Unknown OS";
  let device: "desktop" | "mobile" | "tablet" = "desktop";
  let deviceLabel = "Desktop";

  if (/iPhone/i.test(ua)) {
    os = "iOS";
    device = "mobile";
    deviceLabel = "iPhone";
  } else if (/iPad/i.test(ua)) {
    os = "iPadOS";
    device = "tablet";
    deviceLabel = "iPad";
  } else if (/Android/i.test(ua)) {
    os = "Android";
    const isMobile = /Mobile/i.test(ua);
    device = isMobile ? "mobile" : "tablet";
    deviceLabel = isMobile ? "Android" : "Android tablet";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "macOS";
    device = "desktop";
    deviceLabel = "macOS";
  } else if (/Windows/i.test(ua)) {
    os = "Windows";
    device = "desktop";
    deviceLabel = "Windows";
  } else if (/CrOS/i.test(ua)) {
    os = "ChromeOS";
    device = "desktop";
    deviceLabel = "Chromebook";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
    device = "desktop";
    deviceLabel = "Linux";
  }

  if (/Arc\//i.test(ua)) {
    browser = "Arc";
  } else if (/Edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = "Opera";
  } else if (/Brave/i.test(ua)) {
    browser = "Brave";
  } else if (/Vivaldi/i.test(ua)) {
    browser = "Vivaldi";
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = "Samsung Internet";
  } else if (/CriOS\/([0-9.]+)/i.test(ua)) {
    browser = "Chrome";
  } else if (/FxiOS\/([0-9.]+)/i.test(ua)) {
    browser = "Firefox";
  } else if (/Chrome\/([0-9.]+)/i.test(ua) && !/Chromium/i.test(ua)) {
    browser = "Chrome";
  } else if (/Firefox\/([0-9.]+)/i.test(ua)) {
    browser = "Firefox";
  } else if (
    /Version\/([0-9.]+).*Safari/i.test(ua) ||
    (/Safari/i.test(ua) && /Apple/i.test(ua))
  ) {
    browser = "Safari";
  }

  const title = `${browser} on ${deviceLabel}`;

  let icon = "solar:laptop-minimalistic-bold";
  if (device === "mobile") {
    icon = "solar:smartphone-bold";
  } else if (device === "tablet") {
    icon = "solar:tablet-bold";
  } else if (deviceLabel === "macOS") {
    icon = "solar:laptop-minimalistic-bold";
  } else if (deviceLabel === "Windows" || deviceLabel === "Linux") {
    icon = "solar:monitor-bold";
  }

  return {
    browser,
    device,
    deviceLabel,
    icon,
    os,
    title,
  };
}

export function formatSessionIp(ip?: string | null): string | null {
  if (!ip) return null;
  const trimmed = String(ip).trim();
  if (
    trimmed === "::1" ||
    trimmed === "127.0.0.1" ||
    trimmed === "::ffff:127.0.0.1"
  ) {
    return "Localhost";
  }
  return trimmed;
}

export interface SessionLike {
  is_current?: boolean;
  last_seen_at?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export function formatSessionActivity(session?: SessionLike | null): string {
  if (!session) return "Active session";
  if (session.is_current) return "Active now";

  const dateValue = session.last_seen_at || session.created_at;
  if (!dateValue) return "Active session";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Active session";

  const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return "Active just now";
  if (diffInSeconds < 3600) {
    const mins = Math.max(1, Math.floor(diffInSeconds / 60));
    return `Active ${mins}m ago`;
  }
  if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `Active ${hours}h ago`;
  }
  if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `Active ${days}d ago`;
  }

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);

  return `Active ${formattedDate}`;
}
