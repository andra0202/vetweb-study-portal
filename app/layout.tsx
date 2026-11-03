import type { Metadata } from "next";
import "./styles.css";
import "./vetweb-theme.css";
import { PwaRegister } from "./pwa-register";

export const metadata: Metadata = {
  title: "VetWeb Study Portal",
  description: "VetWeb research participation portal",
  applicationName: "VetWeb Study",
  manifest: "/manifest.webmanifest",
  themeColor: "#a22da7",
  appleWebApp: {
    capable: true,
    title: "VetWeb Study",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PwaRegister />{children}</body></html>;
}
