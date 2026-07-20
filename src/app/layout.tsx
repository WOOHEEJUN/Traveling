import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리 어디가지",
  description: "원주에서 출발하는 우리 둘만의 여행 코스",
  applicationName: "우리 어디가지",
  manifest: "/manifest.webmanifest",
  // 홈 화면에서 열었을 때 브라우저 UI 없이 앱처럼 뜨도록
  appleWebApp: {
    capable: true,
    title: "어디가지",
    statusBarStyle: "default",
  },
  // 검색엔진에 노출될 이유가 없는 개인용 앱
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#ff6b6b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
