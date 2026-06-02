"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { transformEmbeds } from "@/lib/article-html";

type PublicArticleSummary = {
  id: string;
  titre: string;
  chapo: string | null;
  lienPhoto: string | null;
  legendePhoto: string | null;
  rubrique: { libelle: string } | null;
  format: { libelle: string } | null;
  mutuelle: { nom: string } | null;
  datePublication: string | null;
  createdAt: string;
};

type PublicArticleDetail = PublicArticleSummary & {
  contenu: string;
  creditPhoto: string | null;
};

export default function DecouvrirPage() {
  const [articles, setArticles] = useState<PublicArticleSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PublicArticleDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/public/articles?limit=50")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = (data?.articles ?? []) as PublicArticleSummary[];
        setArticles(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => setError("Impossible de charger les exemples."))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setLoadingDetail(true);
    fetch(`/api/public/articles/${selectedId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setDetail(data as PublicArticleDetail | null))
      .finally(() => setLoadingDetail(false));
  }, [selectedId]);

  const renderedHtml = detail?.contenu
    ? transformEmbeds(detail.contenu)
    : "";

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loadingList && (
        <p className="text-sm text-rer-muted">Chargement des exemples…</p>
      )}

      {!loadingList && articles.length === 0 && (
        <p className="rounded-xl border border-rer-border bg-white p-6 text-sm text-rer-muted">
          Aucun contenu exemple n&apos;est disponible pour le moment.
        </p>
      )}

      {articles.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <ul className="space-y-2">
            {articles.map((article) => {
              const active = article.id === selectedId;
              return (
                <li key={article.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(article.id)}
                    className={`flex w-full gap-3 rounded-xl border p-2 text-left transition ${
                      active
                        ? "border-rer-blue bg-rer-blue/5"
                        : "border-rer-border bg-white hover:bg-rer-app"
                    }`}
                  >
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-rer-app">
                      {article.lienPhoto ? (
                        <Image
                          src={article.lienPhoto}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover object-top"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-[10px] text-rer-muted">
                          —
                        </span>
                      )}
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-rer-text">
                        {article.titre}
                      </span>
                      {article.mutuelle?.nom && (
                        <span className="mt-0.5 block text-[11px] text-rer-muted">
                          {article.mutuelle.nom}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <article className="rounded-xl border border-rer-border bg-white p-4 shadow-sm">
            {loadingDetail && (
              <p className="text-sm text-rer-muted">Chargement…</p>
            )}
            {!loadingDetail && detail && (
              <div className="space-y-4">
                {detail.lienPhoto && (
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-rer-app">
                    <Image
                      src={detail.lienPhoto}
                      alt={detail.legendePhoto || detail.titre}
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 720px"
                      className="object-contain"
                    />
                  </div>
                )}
                <h2 className="text-xl font-bold text-rer-text">{detail.titre}</h2>
                <div className="flex flex-wrap gap-2 text-[11px] text-rer-muted">
                  {detail.format?.libelle && <span>{detail.format.libelle}</span>}
                  {detail.rubrique?.libelle && (
                    <span>· {detail.rubrique.libelle}</span>
                  )}
                </div>
                {detail.chapo && (
                  <p className="text-sm font-medium text-rer-text">{detail.chapo}</p>
                )}
                <div
                  className="prose prose-sm max-w-none text-rer-text"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
                {detail.creditPhoto && (
                  <p className="text-[11px] text-rer-muted">{detail.creditPhoto}</p>
                )}
              </div>
            )}
          </article>
        </div>
      )}

      <p className="text-center text-xs text-rer-muted">
        Vous êtes membre du réseau ?{" "}
        <Link href="/login" className="text-rer-blue underline">
          Connectez-vous
        </Link>{" "}
        pour accéder à l&apos;ensemble des contenus.
      </p>
    </div>
  );
}
