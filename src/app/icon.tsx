import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * 앱 아이콘.
 * 두 점을 잇는 길 = 둘이 함께 가는 여행. 코랄 그라디언트는 앱 accent 색과 맞춤.
 */
export default function Icon() {
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
          width="330"
          height="330"
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
