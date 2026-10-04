import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FOUL PLAY FM — Radio for people who wish they were deaf.",
  description: "Radio for people who wish they were deaf. Broadcasting unfiltered satire 24/7.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-[#0A0A0A] text-[#F3F4F6] flex flex-col selection:bg-[#CCFF00] selection:text-black">
        {children}
      </body>
    </html>
  );
}
