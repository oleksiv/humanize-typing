import type { Metadata, Viewport } from "next";
import { DM_Mono, Figtree, Gabarito } from "next/font/google";
import "./globals.css";

const display = Gabarito({ variable: "--font-gabarito", subsets: ["latin"] });
const text = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const mono = DM_Mono({ variable: "--font-dm-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Humanize typing: typing slips for AI-drafted messages",
  description:
    "Paste clean text and get it back hand-typed, with contractions, lowercase starts and the odd typo. Free, in your browser or as an MCP server for Claude.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // m-enter: the design skill's marker that the hero runs its entrance (the CSS rise in page.tsx)
    <html lang="en" className={`m-enter ${display.variable} ${text.variable} ${mono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
