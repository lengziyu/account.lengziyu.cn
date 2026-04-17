import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "冷子雨账号库",
    template: "%s | 冷子雨账号库",
  },
  description: "您的专属本地私密账号保护工具",
  applicationName: "冷子雨账号库",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "冷子雨账号库",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: ["/icon.svg"],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-gray-50 text-gray-900 dark:bg-marketingBlack dark:text-textPrimary antialiased min-h-screen relative pb-20`}>
        <div className="bg-animated-glow"></div>
        <Providers>
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
