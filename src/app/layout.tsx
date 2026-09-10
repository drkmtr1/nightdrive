import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppFrame } from "./app-frame";
import "./styles.css";

export const metadata: Metadata = {
  title: {
    default: "Nightdrive",
    template: "%s | Nightdrive",
  },
  description: "A composition workstation foundation for electronic music producers.",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
