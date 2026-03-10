import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { CartProvider } from "../components/CartContext";
import PixelTracker from "../components/PixelTracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "X-Açaí Delivery | O Melhor Açaí da Região",
  description: "Peça seu açaí rápido e fácil! O cardápio mais completo com montagem personalizada e entrega rápida.",
  manifest: "/manifest.json",
  themeColor: "#9333ea",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://x-acai.delivery",
    siteName: "X-Açaí Delivery",
    title: "X-Açaí Delivery | O Melhor Açaí da Região",
    description: "Personalize seu açaí e receba em casa com agilidade. Qualidade premium garantida!",
    images: [
      {
        url: "/og-image.png", // Base image if no product image
        width: 1200,
        height: 630,
        alt: "X-Açaí Delivery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "X-Açaí Delivery",
    description: "O melhor açaí na sua casa.",
    images: ["/og-image.png"],
  },
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
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <CartProvider>
          <PixelTracker />
          <Header />
          <main className="min-h-screen relative">
            {children}
          </main>
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
