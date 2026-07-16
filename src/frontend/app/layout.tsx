import type { Metadata } from "next";
import { Be_Vietnam_Pro, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Be Vietnam Pro — canonical project BODY sans (designed for Vietnamese; best diacritics
// + long-form readability). Deep-tech indigo system (see DESIGN.md).
// Wired to --font-body (fairterms.css/landing.css) + --font-sans (shadcn).
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
  display: "swap",
});

// Space Grotesk — HEADING/display sans (techy character). Wired to --font-display
// (fairterms.css/landing.css headings) + --font-heading (shadcn h1–h6).
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// IBM Plex Mono — tabular figures: clause numbers, dates, VND amounts (--font-mono).
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FairTerms — Phân tích hợp đồng",
  description:
    "FairTerms rà soát hợp đồng thuê / mua căn hộ, phát hiện điều khoản bất lợi, trái luật hay thiếu sót — kèm trích dẫn truy vết và căn cứ điều luật. Luôn đứng về phía bạn.",
  icons: {
    icon: [
      { url: "/fairterms/favicon.ico", type: "image/x-icon" },
      { url: "/fairterms/logo_light_mode.png", type: "image/png" },
    ],
    apple: "/fairterms/logo_light_mode.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      data-theme="light"
      data-density="compact"
      className={`${beVietnamPro.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {children}
      </body>
    </html>
  );
}
