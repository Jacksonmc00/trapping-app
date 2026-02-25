import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://traplineos.com"),
  title: "TraplineOS",
  description: "Professional Fur Harvest Management",
  manifest: "/manifest.json", 
  openGraph: {
    title: "TraplineOS",
    description: "Professional Fur Harvest Management",
    url: "https://traplineos.com",
    siteName: "TraplineOS",
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TraplineOS",
    description: "Professional Fur Harvest Management",
  },
};

export const viewport: Viewport = {
  themeColor: "#064e3b", 
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster position="top-center" toastOptions={{
          style: { background: '#333', color: '#fff' },
          success: { iconTheme: { primary: '#10b981', secondary: 'white' } },
        }} />
        {children}
      </body>
    </html>
  );
}