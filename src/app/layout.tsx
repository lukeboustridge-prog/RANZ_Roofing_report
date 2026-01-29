import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { UserProvider } from "@/contexts/user-context";
import { SkipLink } from "@/components/ui/skip-link";
import { constructMetadata } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = constructMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1929" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        style={
          {
            "--app-accent": "#D32F2F",
            "--app-accent-foreground": "#ffffff",
          } as React.CSSProperties
        }
      >
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <SkipLink />
          <UserProvider>{children}</UserProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
