import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Primer Paso FCE",
  description: "Pasantías y empleos para estudiantes de la FCE · Prosecretaría de Inserción Laboral (prototipo con datos ficticios).",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Sora:wght@600;700&family=IBM+Plex+Mono:wght@500&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
