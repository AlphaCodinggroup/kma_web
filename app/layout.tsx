import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KMA_web",
  description: "Dashboard de auditorías — KMA_web",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
