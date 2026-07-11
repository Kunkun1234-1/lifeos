import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { RewardToasts } from "@/components/reward-toasts";
import { TopNav } from "@/components/top-nav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const cinzel = Cinzel({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "人生管理系统 · LifeOS",
  description:
    "Personal life management system — PARA + GTD + OKR + gamified.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} antialiased`}
      >
        <Providers>
          <div className="relative min-h-screen">
            <TopNav />
            <main className="relative z-10">{children}</main>
          </div>
          <RewardToasts />
        </Providers>
      </body>
    </html>
  );
}
