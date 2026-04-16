import Link from "next/link";

export const dynamic = "force-dynamic";

export default function RelecteursPage() {
  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-rer-border">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-rer-text">
          Espace d’administration éditoriale
        </h1>
        <p className="text-sm text-rer-muted">
          Cette zone regroupera les outils de relecture et de paramétrage éditorial.
          Pour l’instant, vous pouvez utiliser la vue
          Explorer des articles pour travailler sur la file d&apos;articles.
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/articles?view=explorer&mode=relecteur"
          className="inline-flex items-center gap-2 rounded-full bg-rer-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1e3380]"
        >
          Ouvrir la vue Explorer des articles
        </Link>
        <p className="text-xs text-rer-subtle">
          (Les autres sections du menu sont en cours de conception.)
        </p>
      </div>
    </section>
  );
}

