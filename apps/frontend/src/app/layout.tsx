import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { CartProvider } from "../components/CartContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "X-Açaí Delivery",
  description: "Peça seu açaí rápido e fácil!",
  manifest: "/manifest.json",
  themeColor: "#9333ea",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "X-Açaí",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased pb-[90px]`}>
        <CartProvider>
          <Header />
          <main className="max-w-md mx-auto min-h-screen relative shadow-sm bg-white">
            {children}
          </main>
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
