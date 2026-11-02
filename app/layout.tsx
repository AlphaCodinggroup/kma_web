import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@shared/ui/theme-provider";
import "./globals.css";

const headings = localFont({ src: "../public/fonts/albert-sans.ttf", variable: "--font-heading", display: "swap", weight: "100 900" });
const display = localFont({
  src: "../public/fonts/alumni-sans.ttf",
  weight: "100 900",
  variable: "--font-display",
  display: "swap",
});
const reading = localFont({ src: "../public/fonts/albert-sans.ttf", variable: "--font-reading", display: "swap", weight: "100 900" });

const reporting = localFont({ src: "../public/fonts/source-sans-3.woff2", variable: "--font-reporting", display: "swap", weight: "200 900" });

type RootLayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "KMA",
  description: "KMA — Projects, audits and reviews in one workspace.",
};

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${headings.variable} ${reading.variable} ${reporting.variable}`}><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
};
export default RootLayout;
