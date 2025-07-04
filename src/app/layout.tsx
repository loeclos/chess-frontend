import type { Metadata } from "next";
import { Roboto_Slab } from "next/font/google";
import * as dotenv from 'dotenv';
import "./globals.css";

dotenv.config();

const robotoSlab = Roboto_Slab({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chess game",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${robotoSlab.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
