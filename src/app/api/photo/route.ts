import type { NextRequest } from "next/server";

/**
 * 장소 사진 프록시.
 *
 * 카카오 이미지 검색 썸네일을 브라우저가 직접 불러오면 네트워크 정책이나
 * 핫링크 차단에 걸릴 수 있어서, 서버가 받아서 다시 내려줍니다.
 * SSRF를 막기 위해 카카오 CDN 호스트만 허용합니다.
 */

const ALLOWED_HOST = /^search\d*\.kakaocdn\.net$/;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u");
  if (!raw) {
    return new Response("missing url", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("invalid url", { status: 400 });
  }

  if (target.protocol !== "https:" || !ALLOWED_HOST.test(target.hostname)) {
    return new Response("host not allowed", { status: 403 });
  }

  try {
    const upstream = await fetch(target, {
      // 썸네일은 바뀌지 않으니 오래 캐싱
      next: { revalidate: 60 * 60 * 24 * 30 },
    });

    if (!upstream.ok || !upstream.body) {
      return new Response("upstream error", { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      return new Response("not an image", { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch (e) {
    console.error("사진 프록시 실패", e);
    return new Response("fetch failed", { status: 502 });
  }
}
