/**
 * Exposants automatiques des ordinaux français (1er, 2e, XIXe siècle…).
 *
 * Appliqué à l'affichage et à l'export, jamais au stockage : le texte en base
 * reste « 2e », ce qui garde la recherche plein texte et l'éditeur intacts.
 *
 * Règles :
 * - chiffres arabes : 1er, 1re, 1ers, 1res, 2e, 2es (et les formes fautives
 *   « 2ème », « 2è », « 1ère » sont normalisées en « 2e », « 1re ») ;
 * - chiffres romains (I, V, X uniquement) seulement devant « siècle(s) » ou
 *   « arrondissement(s) », y compris en énumération (« XIXe et XXe siècles »).
 *   Les lettres L, C, D, M sont exclues pour ne pas toucher « Le », « Ce », « De ».
 */

export type OrdinalMatch = {
  /** Position du début de l'ordinal dans le texte. */
  start: number;
  /** Position de fin (exclue). */
  end: number;
  /** Nombre (arabe ou romain), affiché normalement. */
  number: string;
  /** Suffixe normalisé, affiché en exposant. */
  suffix: string;
};

const SUFFIX_MAP: Record<string, string> = {
  er: "er",
  re: "re",
  ers: "ers",
  res: "res",
  e: "e",
  es: "es",
  ème: "e",
  èmes: "es",
  è: "e",
  ère: "re",
  ères: "res",
};

// Les alternatives longues d'abord pour que « ers » l'emporte sur « er ».
const ARABIC_RE =
  /(?<![\p{L}\p{N}])(\d+)(èmes|ères|ème|ère|ers|res|er|re|es|è|e)(?![\p{L}\p{N}])/gu;

const SPACE = "(?:\\s|&nbsp;|&#160;)";
const ROMAN_SUFFIX = "(?:èmes|ème|er|es|e)";
const ROMAN_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])([IVX]+)(èmes|ème|er|es|e)` +
    `(?=(?:${SPACE}*(?:,|et|à|au|ou|-|–)${SPACE}*[IVX]+${ROMAN_SUFFIX})*` +
    `${SPACE}+(?:siècles?|arrondissements?)(?![\\p{L}]))`,
  "gu"
);

/** Repère les ordinaux à mettre en exposant dans un texte brut. */
export function findOrdinals(text: string): OrdinalMatch[] {
  const matches: OrdinalMatch[] = [];
  for (const re of [ARABIC_RE, ROMAN_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const suffix = SUFFIX_MAP[m[2]];
      if (!suffix) continue;
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        number: m[1],
        suffix,
      });
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

/** Version texte brut -> HTML : le texte doit déjà être échappé. */
export function applyOrdinalsToText(text: string): string {
  const matches = findOrdinals(text);
  if (!matches.length) return text;
  let out = "";
  let cursor = 0;
  for (const m of matches) {
    if (m.start < cursor) continue;
    out += text.slice(cursor, m.start) + `${m.number}<sup>${m.suffix}</sup>`;
    cursor = m.end;
  }
  return out + text.slice(cursor);
}

// Balises dont le texte ne doit jamais être transformé.
const SKIP_TAGS = new Set([
  "a",
  "code",
  "pre",
  "sup",
  "sub",
  "script",
  "style",
  "iframe",
  "textarea",
]);

/**
 * Applique les exposants aux nœuds texte d'un fragment HTML, sans toucher aux
 * attributs (src, href…) ni au texte des liens, du code ou des exposants existants.
 */
export function applyOrdinalsToHtml(html: string): string {
  if (!html) return html;
  const parts = html.split(/(<[^>]*>)/g);
  let skipDepth = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;
    if (part.startsWith("<")) {
      const tag = /^<\s*(\/)?\s*([a-zA-Z0-9]+)/.exec(part);
      if (!tag) continue;
      const name = tag[2].toLowerCase();
      if (!SKIP_TAGS.has(name)) continue;
      const selfClosing = /\/\s*>$/.test(part);
      if (tag[1]) skipDepth = Math.max(0, skipDepth - 1);
      else if (!selfClosing) skipDepth += 1;
      continue;
    }
    if (skipDepth === 0) parts[i] = applyOrdinalsToText(part);
  }
  return parts.join("");
}
