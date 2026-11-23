import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Indian Metro Network Tracker",
  description:
    "Interactive map visualizer tracking operational, under-construction, and planned metro rail systems across India.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
