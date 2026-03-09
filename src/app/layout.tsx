import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { ThemedToaster } from "@/components/themed-toaster";
import { getLocaleAndDir } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/server";
import "./globals.css";

const heebo = Heebo({
  subsets: ["latin", "hebrew"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return {
    title: { default: t.metadata.appName, template: `%s | ${t.metadata.appName}` },
    description: t.metadata.appDescription,
    icons: { icon: "/favicon.ico" },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, dir } = await getLocaleAndDir();

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${heebo.className} antialiased bg-gray-50 dark:bg-gray-950`}>
        <ThemeProvider>
          <LocaleProvider locale={locale}>
            {children}
            <ThemedToaster />
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
