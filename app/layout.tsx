import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rescue Santa | Solo Christmas Adventure",
  description: "Race through a snowy winter world, dodge evil snowmen, and free Santa."
};
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false,
  themeColor: "#061b29"
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
