
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css"; 



export const metadata: Metadata = {
  title: "link | comunidade universitária",
  description:
    "Conecta estudantes da Universidade Pedagógica de Maputo.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
