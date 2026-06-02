import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Découvrir la plateforme — RER",
  description: "Exemples de contenus publiés pour découvrir la banque de contenus RER",
};

export default function DecouvrirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-rer-app">
      <header className="border-b border-rer-border bg-white px-4 py-4">
        <div className="mx-auto flex max-w-4xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-rer-text">
              Banque de contenus RER
            </h1>
            <p className="text-sm text-rer-muted">
              Aperçu de la plateforme pour futurs membres du réseau
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-rer-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Se connecter
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
