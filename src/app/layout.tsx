import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "Pulse — AI employee feedback & insights",
  description:
    "Collect employee feedback by text or voice, analyze it with AI, and give HR the themes, risks and actions that matter.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${plexSans.variable} ${plexMono.variable} min-h-dvh antialiased`}>
        {children}
        <Toaster position="bottom-right" toastOptions={{ style: { borderRadius: 14, fontFamily: "var(--font-sans)" } }} />
      </body>
    </html>
  );
}
