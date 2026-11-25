
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/app/components/providers";

export const metadata: Metadata = {
  title: "Programming Contest Platform",
  description: "Online Programming Contest Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
