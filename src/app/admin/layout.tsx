import type { Metadata, Viewport } from "next";
import { Archivo_Black, Poppins } from "next/font/google";
import "../globals.css";
import { Toaster } from "@/components/ui/toast";

const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const archivo = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo" });

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin OnlyPants" },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#0b0d12", colorScheme: "dark" };

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html data-scroll-behavior="smooth" lang="id" className={`${poppins.variable} ${archivo.variable}`}>
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
