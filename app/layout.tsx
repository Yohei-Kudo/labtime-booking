import type { Metadata } from "next";
import "./globals.css";
import "./status.css";
import "./mobile.css";

export const metadata: Metadata = {
  title: "LabTime | マシンタイム予約",
  description: "研究室のGPUサーバーと実験装置を、わかりやすく公平に予約するための内部ツール。",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="ja"><body>{children}</body></html>;
}
