import type { Metadata } from "next";
import "./globals.css";

type RootLayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "KMA",
  description: "Audit management dashboard — KMA",
};

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
};
export default RootLayout;
