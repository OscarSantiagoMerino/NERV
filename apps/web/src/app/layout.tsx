import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NERV",
  description: "Espacio de trabajo compartido para planear, conversar, ejecutar y dirigir proyectos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
