import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "./AuthProvider";
import { AppShell } from "./AppShell";

export const metadata: Metadata = {
  title: "RER Tableau de bord",
  description: "Base de données d’articles",
  icons: {
    icon: "/api/favicon",
    shortcut: "/api/favicon",
    apple: "/api/favicon",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-screen bg-rer-app text-rer-text font-sans">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}

