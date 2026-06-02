type ArticleMetaLineProps = {
  auteurLabel?: string | null;
  mutuelleLabel?: string | null;
  /** ISO date string */
  dateIso?: string | null;
  /** Préfixe affiché avant la date (ex. « Publié le »). */
  datePrefix?: string;
  className?: string;
};

export function ArticleMetaLine({
  auteurLabel,
  mutuelleLabel,
  dateIso,
  datePrefix = "",
  className = "",
}: ArticleMetaLineProps) {
  const identity = [auteurLabel, mutuelleLabel].filter(Boolean).join(" · ");
  const formattedDate = dateIso
    ? new Date(dateIso).toLocaleDateString("fr-FR")
    : null;

  if (!identity && !formattedDate) return null;

  return (
    <div
      className={`flex items-center justify-between gap-2 text-[11px] ${className}`}
    >
      {identity ? (
        <p className="min-w-0 truncate font-medium text-rer-muted">{identity}</p>
      ) : (
        <span />
      )}
      {formattedDate && (
        <time
          className="shrink-0 whitespace-nowrap tabular-nums text-rer-subtle"
          dateTime={dateIso ?? undefined}
        >
          {datePrefix}
          {formattedDate}
        </time>
      )}
    </div>
  );
}
