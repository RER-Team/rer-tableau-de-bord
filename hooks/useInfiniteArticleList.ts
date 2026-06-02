"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";

export type ArticleListItem = { id: string };

type UseInfiniteArticleListOptions<T extends ArticleListItem> = {
  /** Articles fournis par le serveur (page initiale). */
  initialArticles: T[];
  /** Nombre total d'articles correspondant aux filtres. */
  total: number;
  /** Page initiale (1-indexée). */
  initialPage: number;
  /** Construit l'URL de l'API pour une page donnée. */
  buildUrl: (page: number) => string;
  /** Renvoie l'horodatage utilisé pour trier les articles (décroissant). */
  getSortTime: (article: T) => number;
};

type UseInfiniteArticleListResult<T extends ArticleListItem> = {
  visibleArticles: T[];
  setVisibleArticles: React.Dispatch<React.SetStateAction<T[]>>;
  visibleArticlesRef: MutableRefObject<T[]>;
  hasMore: boolean;
  setHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  loadingMore: boolean;
  loadMore: () => Promise<void>;
  sentinelRef: MutableRefObject<HTMLDivElement | null>;
};

/**
 * Gère la liste infinie partagée par les explorateurs d'articles :
 * tri par date, synchronisation avec les props serveur, pagination
 * « charger plus » et observateur d'intersection (scroll infini).
 */
export function useInfiniteArticleList<T extends ArticleListItem>({
  initialArticles,
  total,
  initialPage,
  buildUrl,
  getSortTime,
}: UseInfiniteArticleListOptions<T>): UseInfiniteArticleListResult<T> {
  // On conserve les fonctions dans des refs pour éviter les closures
  // périmées sans recréer loadMore à chaque rendu.
  const buildUrlRef = useRef(buildUrl);
  const getSortTimeRef = useRef(getSortTime);
  useEffect(() => {
    buildUrlRef.current = buildUrl;
  }, [buildUrl]);
  useEffect(() => {
    getSortTimeRef.current = getSortTime;
  }, [getSortTime]);

  const sortByTime = useCallback(
    (list: T[]) =>
      [...list].sort((a, b) => getSortTimeRef.current(b) - getSortTimeRef.current(a)),
    []
  );

  const [visibleArticles, setVisibleArticles] = useState<T[]>(() =>
    sortByTime(initialArticles)
  );
  const [hasMore, setHasMore] = useState(initialArticles.length < total);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const currentPageRef = useRef(initialPage);

  const visibleArticlesRef = useRef<T[]>(visibleArticles);
  useEffect(() => {
    visibleArticlesRef.current = visibleArticles;
  }, [visibleArticles]);

  // Réinitialise la liste lorsque les props serveur changent (filtres, recherche…).
  useEffect(() => {
    setVisibleArticles(sortByTime(initialArticles));
    setHasMore(initialArticles.length < total);
    currentPageRef.current = initialPage;
  }, [initialArticles, total, initialPage, sortByTime]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = currentPageRef.current + 1;
    try {
      const res = await fetch(buildUrlRef.current(nextPage));
      if (!res.ok) {
        setHasMore(false);
        return;
      }
      const data = await res.json();
      const newArticles: T[] = data.articles ?? [];

      const prev = visibleArticlesRef.current;
      const existingIds = new Set(prev.map((a) => a.id));
      const merged = sortByTime([
        ...prev,
        ...newArticles.filter((a) => !existingIds.has(a.id)),
      ]);
      setVisibleArticles(merged);
      currentPageRef.current = nextPage;

      // hasMore est calculé hors du setter pour éviter tout effet de bord.
      if (!newArticles.length || merged.length >= (data.total ?? 0)) {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, sortByTime]);

  // Scroll infini.
  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore]);

  return {
    visibleArticles,
    setVisibleArticles,
    visibleArticlesRef,
    hasMore,
    setHasMore,
    loadingMore,
    loadMore,
    sentinelRef,
  };
}
