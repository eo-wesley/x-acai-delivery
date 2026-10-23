import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";
import { CartProvider } from "../components/CartContext";
import PixelTracker from "../components/PixelTracker";

const inter = localFont({
  src: "../../public/fonts/InterVariable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "X-Açaí | Escolha seu próximo açaí",
  description: "Confira o cardápio X-Açaí, personalize seu pedido e escolha entrega ou retirada, conforme disponibilidade.",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://x-acai.delivery",
    siteName: "X-Açaí Delivery",
    title: "X-Açaí | Cardápio e pedidos",
    description: "Explore o cardápio, personalize seu pedido e acompanhe cada etapa.",
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
    description: "Cardápio, pedidos e acompanhamento X-Açaí.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "X-Açaí",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#41134d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} bg-gray-50 text-gray-900 antialiased`}>
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
