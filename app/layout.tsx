import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rescue Santa | 3D Multiplayer Christmas Adventure",
  description: "Free Santa from the ice cage! Race through the winter wonderland, dodge evil snowmen, and melt the ice with friends.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
