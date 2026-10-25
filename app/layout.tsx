import type { Metadata } from "next";
import "./styles.css";
import "./vetweb-theme.css";

export const metadata: Metadata = {
  title: "VetWeb Study Portal",
  description: "VetWeb research participation portal"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
