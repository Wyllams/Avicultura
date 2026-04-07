import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import SyncProvider from "@/components/SyncProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Avicultura | Gestão de Granjas",
  description: "SaaS de gestão para granjas de frango de corte.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`${inter.variable} ${manrope.variable} font-inter bg-background text-foreground`}>
        <SyncProvider>
          {children}
        </SyncProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}