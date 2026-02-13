import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TraplineOS",
  description: "Professional Fur Harvest Management",
  manifest: "/manifest.json", // Links your new PWA file
};

export const viewport: Viewport = {
  themeColor: "#064e3b", // Sets the iPhone status bar to Emerald Green
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
        {/* The Toaster acts as the notification hub */}
        <Toaster position="top-center" toastOptions={{
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            iconTheme: {
              primary: '#10b981', // Emerald Green Checkmark
              secondary: 'white',
            },
          },
        }} />
        {children}
      </body>
    </html>
  );
}