import { NextRequest, NextResponse } from "next/server";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

function isAllowedMediaUrl(target: string): boolean {
  try {
    const parsed = new URL(target);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    if (API_BASE) {
      const api = new URL(API_BASE);
      if (parsed.origin === api.origin) return true;
    }

    const host = parsed.hostname.toLowerCase();
    return (
      host.includes("amazonaws.com") ||
      host.includes("cloudfront.net") ||
      host.includes("digitaloceanspaces.com") ||
      host.includes("supabase.co") ||
      host.endsWith("railway.app") ||
      host === "glicelabs.com" ||
      host.endsWith(".glicelabs.com")
    );
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u");
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target = raw;
  try {
    target = decodeURIComponent(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (!isAllowedMediaUrl(target)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
      cache: "force-cache",
      next: { revalidate: 3600 },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: upstream.status },
      );
    }

    const contentType =
      upstream.headers.get("content-type") ?? "application/octet-stream";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
