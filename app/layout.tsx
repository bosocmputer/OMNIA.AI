import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "./sidebar";
import { ToastContainer } from "./components/Toast";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "OMNIA.AI — ที่ปรึกษาพยากรณ์ AI",
  description: "รวมทุกศาสตร์พยากรณ์ไว้ในที่เดียว — ขับเคลื่อนด้วย Collaborative AI | OMNIA.AI",
  icons: {
    icon: [{ url: "/assets/logo/TITLELOGO.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/assets/logo/TITLELOGO.svg", type: "image/svg+xml" }],
    apple: [{ url: "/assets/logo/TITLELOGO.png", sizes: "300x300", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") ?? headersList.get("x-pathname") ?? "";
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isPublicStandalonePage = isAuthPage || pathname.startsWith("/privacy") || pathname.startsWith("/terms") || pathname.startsWith("/contact");

  return (
    <html lang="th" data-theme="dark">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:bg-[var(--accent)] focus:text-[var(--bg)]"
        >
          ข้ามไปที่เนื้อหาหลัก
        </a>
        <Providers>
          <div className="min-h-dvh md:flex">
            {!isPublicStandalonePage && <Sidebar />}
            <main id="main-content" tabIndex={-1} className={`flex-1 overflow-auto ${isPublicStandalonePage ? "" : "pt-14 md:pt-0"}`}>
              {children}
            </main>
            {!isPublicStandalonePage && <ToastContainer />}
          </div>
        </Providers>
      </body>
    </html>
  );
}
