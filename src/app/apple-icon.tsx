import { ImageResponse } from "next/og";

// iOS 홈 화면 아이콘. iOS는 모서리를 알아서 깎으므로 여백을 조금 더 둡니다.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #FF8A6B 0%, #FF6B6B 45%, #E24D6B 100%)",
        }}
      >
        <svg
          width="112"
          height="112"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M7.5 18.5h6a3 3 0 0 0 0-6h-3a3 3 0 0 1 0-6h5" />
          <circle cx="5.5" cy="18.5" r="2.1" fill="#ffffff" stroke="none" />
          <circle cx="18.5" cy="5.5" r="2.1" fill="#ffffff" stroke="none" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
