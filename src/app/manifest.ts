import type { MetadataRoute } from "next";

/**
 * 홈 화면에 추가할 때 쓰이는 정보.
 * 이게 없으면 브라우저가 이름·아이콘을 알 수 없어서 엉뚱한 값이 잡힙니다.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "우리 어디가지",
    short_name: "어디가지",
    description: "원주에서 출발하는 우리 둘만의 여행 코스",
    start_url: "/",
    display: "standalone", // 주소창 없이 앱처럼 열기
    orientation: "portrait",
    background_color: "#fafaf9",
    theme_color: "#ff6b6b",
    lang: "ko",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
