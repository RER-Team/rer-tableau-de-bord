 "use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type SuggestionMutuelle = { id: string; nom: string };
type SuggestionRubrique = { id: string; libelle: string };
type SuggestionFormat = { id: string; libelle: string };
type SuggestionsResponse = {
  mutuelles: SuggestionMutuelle[];
  rubriques: SuggestionRubrique[];
  formats: SuggestionFormat[];
};

type FacetMutuelle = { id: string; nom: string; count: number };
type FacetRubrique = { id: string; libelle: string; count: number };
type FacetFormat = { id: string; libelle: string; count: number };

type FacetsResponse = {
  total: number;
  mutuelles: FacetMutuelle[];
  rubriques: FacetRubrique[];
  formats: FacetFormat[];
};

type ArticlesFiltersBarProps = {
  total: number;
  lastCreatedAt?: string | null;
};

function buildSearchParams(
  searchParams: URLSearchParams,
  updates: Record<string, string | null>
): string {
  const params = new URLSearchParams(searchParams.toString());
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });
  // Toujours revenir à la première page quand on change les filtres
  params.set("page", "1");
  return params.toString();
}

function formatDateLabel(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR");
}

function computeSinceForMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type DatePreset = "1m" | "3m" | "6m" | "custom" | null;

/**
 * Détermine le préréglage de date actif à partir des paramètres d'URL.
 * Une période personnalisée prime ; sinon on tente de reconnaître un préréglage
 * connu (1, 3 ou 6 mois) à partir de la valeur `since`.
 */
function detectDatePreset(since: string, from: string, to: string): DatePreset {
  if (from || to) return "custom";
  if (!since) return null;
  if (since === computeSinceForMonths(1)) return "1m";
  if (since === computeSinceForMonths(3)) return "3m";
  if (since === computeSinceForMonths(6)) return "6m";
  return null;
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function ArticlesFiltersBar({
  total,
  lastCreatedAt,
}: ArticlesFiltersBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialMutuelleIds =
    searchParams.get("mutuelleId")?.split(",").filter(Boolean) ?? [];
  const initialRubriqueIds =
    searchParams.get("rubriqueId")?.split(",").filter(Boolean) ?? [];
  const initialFormatIds =
    searchParams.get("formatId")?.split(",").filter(Boolean) ?? [];

  const initialSince = searchParams.get("since") ?? "";
  const initialFrom = searchParams.get("from") ?? "";
  const initialTo = searchParams.get("to") ?? "";

  // Paramètres de date dérivés de l'URL : utilisés comme dépendances stables
  // (évite de re-déclencher des effets sur des params non pertinents comme `article`).
  const sinceParam = searchParams.get("since") ?? "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";

  const [inputValue, setInputValue] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [activeMutuelleIds, setActiveMutuelleIds] =
    useState<string[]>(initialMutuelleIds);
  const [activeRubriqueIds, setActiveRubriqueIds] =
    useState<string[]>(initialRubriqueIds);
  const [activeFormatIds, setActiveFormatIds] =
    useState<string[]>(initialFormatIds);

  const [datePreset, setDatePreset] = useState<DatePreset>(() =>
    detectDatePreset(initialSince, initialFrom, initialTo)
  );
  const [customFrom, setCustomFrom] = useState(initialFrom);
  const [customTo, setCustomTo] = useState(initialTo);

  // Mémorise la dernière valeur `q` poussée dans l'URL afin de ne pas écraser
  // une saisie en cours lors de la resynchronisation depuis searchParams.
  const appliedQRef = useRef(initialQ);

  const [facets, setFacets] = useState<FacetsResponse | null>(null);
  const [loadingFacets, setLoadingFacets] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const [suggestions, setSuggestions] = useState<SuggestionsResponse | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  const currentView =
    searchParams.get("view") === "cards" ||
    searchParams.get("view") === "table" ||
    searchParams.get("view") === "explorer"
      ? (searchParams.get("view") as "cards" | "table" | "explorer")
      : "explorer";

  const isFacetLabel = (s: string) =>
    /^(Mutuelle|Rubrique|Format)\s*:\s*\S+$/.test((s ?? "").trim());

  // Resynchronise l'UI avec l'URL (navigation arrière/avant). On préserve les
  // références d'array inchangées et on n'écrase pas une saisie texte en cours.
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== appliedQRef.current) {
      appliedQRef.current = q;
      setInputValue(q);
      setDebouncedQ(q);
    }
    const nextMutuelles =
      searchParams.get("mutuelleId")?.split(",").filter(Boolean) ?? [];
    const nextRubriques =
      searchParams.get("rubriqueId")?.split(",").filter(Boolean) ?? [];
    const nextFormats =
      searchParams.get("formatId")?.split(",").filter(Boolean) ?? [];
    setActiveMutuelleIds((prev) => (sameIds(prev, nextMutuelles) ? prev : nextMutuelles));
    setActiveRubriqueIds((prev) => (sameIds(prev, nextRubriques) ? prev : nextRubriques));
    setActiveFormatIds((prev) => (sameIds(prev, nextFormats) ? prev : nextFormats));
    setCustomFrom(fromParam);
    setCustomTo(toParam);
    setDatePreset(detectDatePreset(sinceParam, fromParam, toParam));
  }, [searchParams, sinceParam, fromParam, toParam]);

  // Charger les suggestions (facettes filtrées localement) quand on tape
  useEffect(() => {
    const term = inputValue.trim();
    if (term.length < 2) {
      setSuggestions(null);
      setShowSuggestions(false);
      return;
    }
    if (isFacetLabel(term)) {
      setSuggestions(null);
      setShowSuggestions(false);
      return;
    }

    if (!facets) {
      setSuggestions(null);
      setShowSuggestions(false);
      return;
    }

    const lower = term.toLowerCase();
    const next: SuggestionsResponse = {
      mutuelles: facets.mutuelles.filter((m) =>
        m.nom.toLowerCase().includes(lower)
      ),
      rubriques: facets.rubriques.filter((r) =>
        r.libelle.toLowerCase().includes(lower)
      ),
      formats: facets.formats.filter((f) =>
        f.libelle.toLowerCase().includes(lower)
      ),
    };

    setSuggestions(next);
    setShowSuggestions(true);
    setLoadingSuggestions(false);
  }, [inputValue, facets]);

  // Fermer les suggestions au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasSuggestions =
    showSuggestions &&
    inputValue.trim().length >= 2 &&
    (loadingSuggestions || suggestions !== null);

  // Debounce de la recherche texte ; ne pas traiter un libellé de facette comme recherche
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const term = inputValue.trim();
      setDebouncedQ(isFacetLabel(term) ? "" : term);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [inputValue]);

  // Mettre à jour l'URL quand q change (via debounce) ; retirer display si on tape une vraie recherche
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentQ = params.get("q") ?? "";
    const qToApply = debouncedQ && !isFacetLabel(debouncedQ) ? debouncedQ : "";
    if (qToApply === currentQ) return;
    // Marque ce push comme le nôtre pour que l'effet de resynchronisation
    // ne réécrive pas la saisie texte.
    appliedQRef.current = qToApply;
    const next = buildSearchParams(params, {
      q: qToApply || null,
      display: null,
    });
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [debouncedQ, pathname, router, searchParams]);

  // Charger les facettes en fonction de q
  useEffect(() => {
    const controller = new AbortController();
    const fetchFacets = async () => {
      setLoadingFacets(true);
      try {
        const params = new URLSearchParams();
        if (debouncedQ) params.set("q", debouncedQ);
        if (activeMutuelleIds.length) {
          params.set("mutuelleId", activeMutuelleIds.join(","));
        }
        if (activeRubriqueIds.length) {
          params.set("rubriqueId", activeRubriqueIds.join(","));
        }
        if (activeFormatIds.length) {
          params.set("formatId", activeFormatIds.join(","));
        }
        if (sinceParam) params.set("since", sinceParam);
        if (fromParam) params.set("from", fromParam);
        if (toParam) params.set("to", toParam);
        const res = await fetch(`/api/articles/facets?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          setFacets(null);
          return;
        }
        const data = (await res.json()) as FacetsResponse;
        setFacets(data);
      } catch {
        if (controller.signal.aborted) return;
        setFacets(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoadingFacets(false);
        }
      }
    };
    fetchFacets();
    return () => controller.abort();
  }, [
    debouncedQ,
    activeMutuelleIds,
    activeRubriqueIds,
    activeFormatIds,
    sinceParam,
    fromParam,
    toParam,
  ]);

  const derivedTotal = useMemo(() => {
    if (facets && debouncedQ.trim()) {
      return facets.total;
    }
    return total;
  }, [facets, debouncedQ, total]);

  const lastCreatedAtLabel = useMemo(
    () => formatDateLabel(lastCreatedAt),
    [lastCreatedAt]
  );

  const activeMutuelleFacets = useMemo(
    () =>
      facets?.mutuelles.filter((m) => activeMutuelleIds.includes(m.id)) ?? [],
    [facets, activeMutuelleIds]
  );

  const activeRubriqueFacets = useMemo(
    () =>
      facets?.rubriques.filter((r) => activeRubriqueIds.includes(r.id)) ?? [],
    [facets, activeRubriqueIds]
  );

  const activeFormatFacets = useMemo(
    () =>
      facets?.formats.filter((f) => activeFormatIds.includes(f.id)) ?? [],
    [facets, activeFormatIds]
  );

  const handleFacetToggle = (type: "mutuelle" | "rubrique" | "format", id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("display");
    const key =
      type === "mutuelle" ? "mutuelleId" : type === "rubrique" ? "rubriqueId" : "formatId";

    const current =
      type === "mutuelle"
        ? activeMutuelleIds
        : type === "rubrique"
        ? activeRubriqueIds
        : activeFormatIds;

    const exists = current.includes(id);
    const nextArray = exists ? current.filter((x) => x !== id) : [...current, id];

    if (type === "mutuelle") setActiveMutuelleIds(nextArray);
    if (type === "rubrique") setActiveRubriqueIds(nextArray);
    if (type === "format") setActiveFormatIds(nextArray);

    const nextValue = nextArray.length ? nextArray.join(",") : null;
    const next = buildSearchParams(params, { [key]: nextValue });
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const hasActiveFacets =
    activeMutuelleIds.length || activeRubriqueIds.length || activeFormatIds.length;
  const hasActiveSearch = Boolean(debouncedQ.trim());
  const hasActiveDate =
    Boolean(searchParams.get("since")) ||
    Boolean(searchParams.get("from")) ||
    Boolean(searchParams.get("to"));
  const hasActiveFilters = hasActiveFacets || hasActiveSearch || hasActiveDate;

  const handleDatePresetClick = (preset: "1m" | "3m" | "6m") => {
    const params = new URLSearchParams(searchParams.toString());
    const since =
      preset === "1m"
        ? computeSinceForMonths(1)
        : preset === "3m"
        ? computeSinceForMonths(3)
        : computeSinceForMonths(6);
    setDatePreset(preset);
    setCustomFrom("");
    setCustomTo("");
    const next = buildSearchParams(params, {
      since,
      from: null,
      to: null,
    });
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const handleCustomDateChange = (field: "from" | "to", value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const nextFrom = field === "from" ? value : customFrom;
    const nextTo = field === "to" ? value : customTo;

    setDatePreset("custom");
    setCustomFrom(nextFrom);
    setCustomTo(nextTo);

    const next = buildSearchParams(params, {
      since: null,
      from: nextFrom || null,
      to: nextTo || null,
    });
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  const handleReset = () => {
    setInputValue("");
    setDebouncedQ("");
    setActiveMutuelleIds([]);
    setActiveRubriqueIds([]);
    setActiveFormatIds([]);
    setDatePreset(null);
    setCustomFrom("");
    setCustomTo("");
    router.replace(pathname, { scroll: false });
  };

  const applyFacetSuggestion = (
    type: "mutuelle" | "rubrique" | "format",
    id: string,
    label: string
  ) => {
    const key =
      type === "mutuelle" ? "mutuelleId" : type === "rubrique" ? "rubriqueId" : "formatId";
    const current =
      type === "mutuelle"
        ? activeMutuelleIds
        : type === "rubrique"
        ? activeRubriqueIds
        : activeFormatIds;
    const nextArray = current.includes(id) ? current : [...current, id];
    if (type === "mutuelle") setActiveMutuelleIds(nextArray);
    if (type === "rubrique") setActiveRubriqueIds(nextArray);
    if (type === "format") setActiveFormatIds(nextArray);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("display");
    params.set(key, nextArray.join(","));
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });

    setInputValue("");
    setDebouncedQ("");
    setShowSuggestions(false);
  };

  const applyTextSearch = () => {
    const term = inputValue.trim();
    if (term) {
      setDebouncedQ(term);
      const params = new URLSearchParams(searchParams.toString());
      const next = buildSearchParams(params, { q: term });
      router.replace(`${pathname}?${next}`, { scroll: false });
    }
    setShowSuggestions(false);
  };

  return (
    <section
      aria-labelledby="filtres"
      className="mb-4 space-y-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-rer-border lg:mb-6"
    >
      <div className="flex flex-wrap items-start gap-3">
        <div
          ref={searchWrapperRef}
          className="relative w-full min-w-0 max-w-full sm:flex-1 sm:min-w-[220px]"
        >
          <div className="w-full min-w-0">
            <label
              htmlFor="q"
              className="sr-only lg:block text-xs font-medium uppercase tracking-wide text-rer-muted"
            >
              Recherche texte
            </label>
            <input
              type="search"
              id="q"
              name="q"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onFocus={() => inputValue.trim().length >= 2 && setShowSuggestions(true)}
              placeholder="Titre, chapô, contenu, ou nom de mutuelle / rubrique / format..."
              className="mt-1 w-full rounded-lg border border-rer-border bg-white px-3 py-1.5 text-sm text-rer-text shadow-sm focus:border-rer-blue focus:outline-none focus:ring-1 focus:ring-rer-blue"
              autoComplete="off"
              aria-controls="search-suggestions"
              aria-autocomplete="list"
            />
          </div>

          {hasSuggestions && (
            <div
              id="search-suggestions"
              role="listbox"
              className="absolute top-full left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-rer-border bg-white py-1 shadow-lg"
            >
              {loadingSuggestions ? (
                <p className="px-3 py-2 text-xs text-rer-muted">Recherche des suggestions…</p>
              ) : suggestions ? (
                <>
                  {suggestions.mutuelles.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => applyFacetSuggestion("mutuelle", m.id, `Mutuelle : ${m.nom}`)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rer-text hover:bg-rer-app"
                    >
                      <span className="text-[10px] font-semibold uppercase text-rer-muted">
                        Mutuelle
                      </span>
                      <span>{m.nom}</span>
                    </button>
                  ))}
                  {suggestions.rubriques.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => applyFacetSuggestion("rubrique", r.id, `Rubrique : ${r.libelle}`)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rer-text hover:bg-rer-app"
                    >
                      <span className="text-[10px] font-semibold uppercase text-rer-muted">
                        Rubrique
                      </span>
                      <span>{r.libelle}</span>
                    </button>
                  ))}
                  {suggestions.formats.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => applyFacetSuggestion("format", f.id, `Format : ${f.libelle}`)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rer-text hover:bg-rer-app"
                    >
                      <span className="text-[10px] font-semibold uppercase text-rer-muted">
                        Format
                      </span>
                      <span>{f.libelle}</span>
                    </button>
                  ))}
                  {(suggestions.mutuelles.length > 0 ||
                    suggestions.rubriques.length > 0 ||
                    suggestions.formats.length > 0) && (
                    <div className="border-t border-rer-border px-2 pt-1">
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={applyTextSearch}
                        className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm font-medium text-rer-text hover:bg-rer-app"
                      >
                        Rechercher « {inputValue.trim()} » dans le texte (titre, chapô, contenu)
                      </button>
                    </div>
                  )}
                  {suggestions.mutuelles.length === 0 &&
                    suggestions.rubriques.length === 0 &&
                    suggestions.formats.length === 0 && (
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={applyTextSearch}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-rer-text hover:bg-rer-app"
                      >
                        Rechercher « {inputValue.trim()} » dans le texte
                      </button>
                    )}
                </>
              ) : null}
            </div>
          )}
        </div>

        <div className="hidden items-center gap-1 rounded-lg border border-rer-border bg-rer-app p-1 text-xs font-medium text-rer-muted lg:flex">
          <Link
            href={{
              pathname,
              query: {
                ...Object.fromEntries(searchParams.entries()),
                view: "explorer",
              },
            }}
            className={`rounded-lg px-3 py-1.5 ${
              currentView === "explorer"
                ? "bg-white text-rer-blue shadow-sm"
                : "hover:bg-white/60"
            }`}
          >
            Explorer
          </Link>
          <Link
            href={{
              pathname,
              query: {
                ...Object.fromEntries(searchParams.entries()),
                view: "cards",
              },
            }}
            className={`rounded-lg px-3 py-1.5 ${
              currentView === "cards"
                ? "bg-white text-rer-blue shadow-sm"
                : "hover:bg-white/60"
            }`}
          >
            Cartes
          </Link>
          <Link
            href={{
              pathname,
              query: {
                ...Object.fromEntries(searchParams.entries()),
                view: "table",
              },
            }}
            className={`rounded-lg px-3 py-1.5 ${
              currentView === "table"
                ? "bg-white text-rer-blue shadow-sm"
                : "hover:bg-white/60"
            }`}
          >
            Tableau
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-rer-muted">
          {derivedTotal} article{derivedTotal > 1 ? "s" : ""} trouvé
          {derivedTotal > 1 ? "s" : ""}.
          {debouncedQ && (
            <>
              {" "}
              Recherche sur <span className="font-semibold">« {debouncedQ} »</span>.
            </>
          )}
          {lastCreatedAtLabel && (
            <>
              {" "}
              <span className="text-[11px] text-rer-subtle">
                · Dernier article publié le {lastCreatedAtLabel}
              </span>
            </>
          )}
        </p>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-medium text-rer-muted underline-offset-2 hover:text-rer-text hover:underline"
            >
              Réinitialiser tous les filtres
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="text-xs font-medium text-rer-muted underline-offset-2 hover:text-rer-text hover:underline"
          >
            {isCollapsed ? "Afficher les filtres" : "Masquer les filtres"}
          </button>
        </div>
      </div>

      {(activeMutuelleFacets.length > 0 ||
        activeRubriqueFacets.length > 0 ||
        activeFormatFacets.length > 0) && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {activeMutuelleFacets.map((m) => (
            <button
              key={`active-mutuelle-${m.id}`}
              type="button"
              onClick={() => handleFacetToggle("mutuelle", m.id)}
              className="chip-filter chip-filter--active inline-flex items-center gap-1"
            >
              <span>{m.nom}</span>
              <span className="text-[10px] opacity-80">· {m.count}</span>
              <span className="text-[11px] leading-none">×</span>
            </button>
          ))}
          {activeRubriqueFacets.map((r) => (
            <button
              key={`active-rubrique-${r.id}`}
              type="button"
              onClick={() => handleFacetToggle("rubrique", r.id)}
              className="chip-filter chip-filter--active inline-flex items-center gap-1"
            >
              <span>{r.libelle}</span>
              <span className="text-[11px] leading-none">×</span>
            </button>
          ))}
          {activeFormatFacets.map((f) => (
            <button
              key={`active-format-${f.id}`}
              type="button"
              onClick={() => handleFacetToggle("format", f.id)}
              className="chip-filter chip-filter--active inline-flex items-center gap-1"
            >
              <span>{f.libelle}</span>
              <span className="text-[11px] leading-none">×</span>
            </button>
          ))}
        </div>
      )}

      {!isCollapsed && facets && (
        <div className="space-y-1 rounded-lg border border-rer-border bg-rer-app/60 p-2 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-semibold text-slate-700">Mutuelles</span>
            {facets.mutuelles.length === 0 && (
              <span className="text-slate-400">Aucune distinction particulière</span>
            )}
            {facets.mutuelles.map((m) => {
              const active = activeMutuelleIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleFacetToggle("mutuelle", m.id)}
                  className={`chip-filter ${active ? "chip-filter--active" : ""}`}
                >
                  <span className="truncate">{m.nom}</span>
                  <span className="ml-1 text-[10px] opacity-80">· {m.count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="font-semibold text-slate-700">Rubriques</span>
            {facets.rubriques.length === 0 && (
              <span className="text-slate-400">Aucune distinction particulière</span>
            )}
            {facets.rubriques.map((r) => {
              const active = activeRubriqueIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleFacetToggle("rubrique", r.id)}
                  className={`chip-filter ${active ? "chip-filter--active" : ""}`}
                >
                  <span className="truncate">{r.libelle}</span>
                  <span className="ml-1 text-[10px] opacity-80">· {r.count}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <span className="font-semibold text-slate-700">Formats</span>
            {facets.formats.length === 0 && (
              <span className="text-slate-400">Aucune distinction particulière</span>
            )}
            {facets.formats.map((f) => {
              const active = activeFormatIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFacetToggle("format", f.id)}
                  className={`chip-filter ${active ? "chip-filter--active" : ""}`}
                >
                  <span className="truncate">{f.libelle}</span>
                  <span className="ml-1 text-[10px] opacity-80">· {f.count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className="font-semibold text-rer-text">Dates</span>
            <button
              type="button"
              onClick={() => handleDatePresetClick("1m")}
              className={`chip-filter ${datePreset === "1m" ? "chip-filter--active" : ""}`}
            >
              Depuis 1 mois
            </button>
            <button
              type="button"
              onClick={() => handleDatePresetClick("3m")}
              className={`chip-filter ${datePreset === "3m" ? "chip-filter--active" : ""}`}
            >
              Depuis 3 mois
            </button>
            <button
              type="button"
              onClick={() => handleDatePresetClick("6m")}
              className={`chip-filter ${datePreset === "6m" ? "chip-filter--active" : ""}`}
            >
              Depuis 6 mois
            </button>
            <div className="ml-2 flex flex-wrap items-center gap-1 text-[11px] text-rer-muted">
              <span>Période personnalisée :</span>
              <input
                type="date"
                aria-label="Date de début"
                value={customFrom}
                onChange={(e) => handleCustomDateChange("from", e.target.value)}
                className="h-6 rounded border border-rer-border bg-white px-1 text-[11px]"
              />
              <span>au</span>
              <input
                type="date"
                aria-label="Date de fin"
                value={customTo}
                onChange={(e) => handleCustomDateChange("to", e.target.value)}
                className="h-6 rounded border border-rer-border bg-white px-1 text-[11px]"
              />
            </div>
          </div>

          {loadingFacets && (
            <p className="text-[10px] text-rer-subtle">Mise à jour des facettes…</p>
          )}
        </div>
      )}
    </section>
  );
}

