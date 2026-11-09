import type { Metadata } from "next";
import { Bebas_Neue, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { CustomerProvider } from "@/context/CustomerContext";

export const metadata: Metadata = {
  title: "GIFTEDproMovies — Watch & Download Movies and Series in Swahili",
  description: "East Africa's premier streaming and offline media platform with certified DJ commentary and Swahili translations.",
  icons: {
    icon: [
      { url: '/brand/logo.png', sizes: 'any' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bebasNeue.variable} ${manrope.variable} ${spaceGrotesk.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#08090C] text-[#F5F5F5] font-sans selection:bg-[#E50914] selection:text-white">
        <AuthProvider>
          <NotificationProvider>
            <CustomerProvider>{children}</CustomerProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
