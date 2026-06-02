"use client";

import { useEffect, useMemo, useState } from "react";

export const dynamic = "force-dynamic";

type TopArticle = {
  articleId: string;
  titre: string;
  auteur: string | null;
  mutuelle: string | null;
  totalViews: number;
  uniqueReaders: number;
};

type StatsPayload = {
  totalViews: number;
  uniqueReaders: number;
  topArticles: TopArticle[];
};

export default function AdminStatistiquesPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsPayload | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }, [from, to]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = `/api/admin/stats/consultations${query ? `?${query}` : ""}`;
    fetch(url, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error ?? "Impossible de charger les statistiques.");
        }
        return payload as StatsPayload;
      })
      .then((payload) => setStats(payload))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-rer-text">Statistiques de consultation</h1>
        <p className="mt-1 text-sm text-rer-muted">
          Mesure interne des lectures par article (membres connectés uniquement).
        </p>
      </header>

      <div className="grid gap-3 rounded-xl border border-rer-border bg-white p-4 md:grid-cols-3">
        <label className="text-sm">
          <span className="block text-rer-muted">Du</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-rer-border px-2 py-1"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="block text-rer-muted">Au</span>
          <input
            type="date"
            className="mt-1 w-full rounded border border-rer-border px-2 py-1"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
      </div>

      {loading && <p className="text-sm text-rer-muted">Chargement…</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {!loading && !error && stats && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-xl border border-rer-border bg-white p-4">
              <p className="text-xs text-rer-muted">Vues totales</p>
              <p className="mt-1 text-2xl font-semibold text-rer-text">{stats.totalViews}</p>
            </article>
            <article className="rounded-xl border border-rer-border bg-white p-4">
              <p className="text-xs text-rer-muted">Lecteurs uniques</p>
              <p className="mt-1 text-2xl font-semibold text-rer-text">{stats.uniqueReaders}</p>
            </article>
          </div>

          <div className="rounded-xl border border-rer-border bg-white p-4">
            <h2 className="text-sm font-semibold text-rer-text">Top articles consultés</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {stats.topArticles.length === 0 && (
                <li className="text-rer-muted">Aucune consultation sur la période.</li>
              )}
              {stats.topArticles.map((item) => (
                <li key={item.articleId} className="rounded-lg border border-rer-border p-2">
                  <p className="font-medium text-rer-text">{item.titre}</p>
                  <p className="text-xs text-rer-muted">
                    {item.auteur ?? "Auteur inconnu"}
                    {item.mutuelle ? ` · ${item.mutuelle}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-rer-muted">
                    {item.totalViews} vues · {item.uniqueReaders} lecteurs uniques
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
