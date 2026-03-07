import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const heebo = Heebo({
  subsets: ["latin", "hebrew"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: { default: "מחירון", template: "%s | מחירון" },
  description: "מערכת ניהול בקשות הצעת מחיר",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.className} antialiased bg-gray-50`}>
        {children}
        <Toaster position="bottom-left" dir="rtl" richColors />
      </body>
    </html>
  );
}
