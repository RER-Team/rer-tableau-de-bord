/**
 * Import des articles de l'ancien système (CSV ou XLSX) vers la BDD.
 *
 * Usage :
 *   npx tsx scripts/import-xlsx-to-db.ts --file "chemin.csv"            # DRY-RUN (rapport seulement)
 *   npx tsx scripts/import-xlsx-to-db.ts --file "chemin.csv" --commit   # écrit réellement en base
 *   npx tsx scripts/import-xlsx-to-db.ts --limit 20                     # ne traite que 20 lignes (test)
 *
 * Sans --file, le XLSX du repo (Documentation initiale/) est utilisé.
 *
 * Colonnes IGNORÉES (inutiles) : Adresse e-mail OLD, Photo miniature (base64),
 * Lien html/rtf/Word, Lien correction (+ raw), Id article.
 *
 * Étape suivante (images) : une fois l'import fait, lancer
 *   npx tsx scripts/migrate-ibb-images.ts
 * qui télécharge les images i.ibb.co, les COMPRESSE (sharp, 1600px, JPEG q70)
 * et les transfère sur Supabase Storage en réécrivant les URLs.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { parse as parseCsv } from "csv-parse/sync";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

const DEFAULT_FILE = path.join(
  process.cwd(),
  "Documentation initiale",
  "BDD articles Le Mutualiste - RER.xlsx"
);

// --- Arguments CLI ---
const args = process.argv.slice(2);
const COMMIT = args.includes("--commit");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1] ?? "0", 10) : 0;
const fileIdx = args.indexOf("--file");
const FILE = fileIdx >= 0 ? args[fileIdx + 1] : DEFAULT_FILE;

/**
 * Correspondance des états de l'ancien système vers les slugs cibles.
 * États canoniques affichés : a_relire (à relire) et publie (publié, visible dans la banque).
 * ⚠️ À VALIDER : "Relu" est considéré comme contenu finalisé → publié (visible publiquement).
 */
const ETAT_MAPPING: Record<string, string> = {
  "A relire": "a_relire",
  "Relu": "publie",
  "Mettre à jour": "a_relire",
};

const ETATS_CANONIQUES: { slug: string; libelle: string; ordre: number }[] = [
  { slug: "brouillon", libelle: "Brouillon", ordre: -1 },
  { slug: "a_relire", libelle: "À relire", ordre: 1 },
  { slug: "publie", libelle: "Publié", ordre: 2 },
];

// Noms de colonnes (en-têtes) attendus, tels qu'exportés.
const H = {
  code: "Code article",
  horodateur: "Horodateur",
  titre: "Titre",
  chapo: "Chapô",
  texte: "Texte",
  auteur: "Auteur",
  prenom: "Prénom",
  mutuelle: "Mutuelle",
  rubrique: "Rubrique",
  legendePhoto: "Légende photo",
  postRs: "Post Réseaux sociaux",
  lienPhoto: "Lien de la photo",
  format: "Format d'article",
  etat: "Etat de l'article",
  email: "Email",
  nombreSignes: "Nombre de signes",
  lienArticle: "Lien article",
} as const;

type Record_ = Record<string, string>;

function normHeader(s: string): string {
  return s.replace(/\uFEFF/g, "").trim();
}

function richToString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("error" in o) return "";
    if ("hyperlink" in o) return String((o.text as string) ?? (o.hyperlink as string) ?? "").trim();
    if ("richText" in o && Array.isArray(o.richText))
      return (o.richText as { text?: string }[]).map((r) => r.text ?? "").join("").trim();
    if ("formula" in o || "sharedFormula" in o) {
      const r = o.result;
      if (r == null) return "";
      if (typeof r === "object") {
        const ro = r as Record<string, unknown>;
        return "error" in ro ? "" : String(ro.text ?? "").trim();
      }
      return String(r).trim();
    }
    if ("text" in o) return String(o.text ?? "").trim();
  }
  return "";
}

/** Charge les enregistrements (clés = en-têtes nettoyés) depuis CSV ou XLSX. */
async function loadRecords(file: string): Promise<{ records: Record_[]; cellDates: Map<number, Date | null> }> {
  const ext = path.extname(file).toLowerCase();
  const records: Record_[] = [];

  if (ext === ".csv") {
    const raw = fs.readFileSync(file, "utf8");
    const rows: string[][] = parseCsv(raw, {
      bom: true,
      relax_quotes: true,
      relax_column_count: true,
      skip_empty_lines: true,
    });
    if (rows.length === 0) return { records, cellDates: new Map() };
    const headers = rows[0].map(normHeader);
    for (let i = 1; i < rows.length; i++) {
      const rec: Record_ = {};
      headers.forEach((h, c) => (rec[h] = (rows[i][c] ?? "").trim()));
      records.push(rec);
    }
    return { records, cellDates: new Map() };
  }

  // XLSX
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Feuille 1 introuvable dans le XLSX.");
  const header = ws.getRow(1);
  const headers: string[] = [];
  for (let c = 1; c <= ws.columnCount; c++) headers[c] = normHeader(richToString(header.getCell(c).value));
  const horodateurCol = headers.findIndex((h) => h === H.horodateur);
  const cellDates = new Map<number, Date | null>();
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rec: Record_ = {};
    for (let c = 1; c <= ws.columnCount; c++) {
      const key = headers[c];
      if (key) rec[key] = richToString(row.getCell(c).value);
    }
    // Conserve l'objet Date natif de l'horodateur (XLSX) pour parsing fiable.
    if (horodateurCol > 0) {
      const v = row.getCell(horodateurCol).value;
      cellDates.set(records.length, v instanceof Date ? v : null);
    }
    records.push(rec);
  }
  return { records, cellDates };
}

/** Parse "DD/MM/YYYY HH:MM:SS" (CSV) ou ISO. */
function parseFrDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const [, d, mo, y, hh, mm, ss] = m;
    const dt = new Date(
      Number(y), Number(mo) - 1, Number(d),
      Number(hh ?? 0), Number(mm ?? 0), Number(ss ?? 0)
    );
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function cleanLabel(s: string): string {
  const t = (s ?? "").trim();
  if (!t) return "";
  if (t.startsWith("{") && t.includes("error")) return "";
  if (t === "#REF!" || t === "#N/A") return "";
  return t;
}

function splitAuteur(full: string, prenomHint: string): { prenom: string; nom: string } {
  const f = (full ?? "").trim().replace(/\s+/g, " ");
  if (!f) return { prenom: "", nom: "" };
  const prenom = (prenomHint ?? "").trim();
  if (prenom && f.toLowerCase().startsWith(prenom.toLowerCase())) {
    const nom = f.slice(prenom.length).trim();
    return { prenom, nom: nom || prenom };
  }
  const parts = f.split(" ");
  if (parts.length === 1) return { prenom: parts[0], nom: parts[0] };
  return { prenom: parts[0], nom: parts.slice(1).join(" ") };
}

async function main() {
  console.log(`\n=== Import CSV/XLSX → BDD ===`);
  console.log(`Fichier : ${FILE}`);
  console.log(`Mode    : ${COMMIT ? "COMMIT (écriture réelle)" : "DRY-RUN (aucune écriture)"}`);
  if (LIMIT) console.log(`Limite  : ${LIMIT} lignes`);
  console.log("");

  const { records, cellDates } = await loadRecords(FILE);

  const report = {
    totalRows: records.length,
    processed: 0,
    skippedEmpty: 0,
    articles: 0,
    withPhoto: 0,
    missingAuteur: 0,
    missingContenu: 0,
    mutuelles: new Set<string>(),
    rubriques: new Set<string>(),
    formats: new Set<string>(),
    etats: new Set<string>(),
    auteurs: new Set<string>(),
    unknownEtat: new Set<string>(),
    errors: [] as string[],
  };

  const mutuelleId = new Map<string, string>();
  const rubriqueId = new Map<string, string>();
  const formatId = new Map<string, string>();
  const etatId = new Map<string, string>();
  const auteurId = new Map<string, string>();

  if (COMMIT) {
    for (const e of ETATS_CANONIQUES) {
      const row = await prisma.etat.upsert({ where: { slug: e.slug }, update: { libelle: e.libelle, ordre: e.ordre }, create: e });
      etatId.set(e.slug, row.id);
    }
  }

  const ensureMutuelle = async (nom: string): Promise<string | null> => {
    const key = cleanLabel(nom);
    if (!key) return null;
    report.mutuelles.add(key);
    if (!COMMIT) return null;
    if (mutuelleId.has(key)) return mutuelleId.get(key)!;
    const row = await prisma.mutuelle.upsert({ where: { nom: key }, update: {}, create: { nom: key } });
    mutuelleId.set(key, row.id);
    return row.id;
  };
  const ensureRubrique = async (libelle: string): Promise<string | null> => {
    const key = cleanLabel(libelle);
    if (!key) return null;
    report.rubriques.add(key);
    if (!COMMIT) return null;
    if (rubriqueId.has(key)) return rubriqueId.get(key)!;
    const row = await prisma.rubrique.upsert({ where: { libelle: key }, update: {}, create: { libelle: key } });
    rubriqueId.set(key, row.id);
    return row.id;
  };
  const ensureFormat = async (libelle: string): Promise<string | null> => {
    const key = cleanLabel(libelle);
    if (!key) return null;
    report.formats.add(key);
    if (!COMMIT) return null;
    if (formatId.has(key)) return formatId.get(key)!;
    const row = await prisma.format.upsert({ where: { libelle: key }, update: {}, create: { libelle: key } });
    formatId.set(key, row.id);
    return row.id;
  };
  const resolveEtat = (oldValue: string): { slug: string | null; id: string | null } => {
    const raw = cleanLabel(oldValue);
    if (!raw) return { slug: null, id: null };
    const slug = ETAT_MAPPING[raw];
    if (!slug) {
      report.unknownEtat.add(raw);
      return { slug: null, id: null };
    }
    report.etats.add(slug);
    return { slug, id: COMMIT ? etatId.get(slug) ?? null : null };
  };
  const ensureAuteur = async (prenom: string, nom: string, email: string, mutId: string | null): Promise<string | null> => {
    if (!prenom && !nom) return null;
    const key = `${prenom}|||${nom}`;
    report.auteurs.add(`${prenom} ${nom}`.trim());
    if (!COMMIT) return null;
    if (auteurId.has(key)) return auteurId.get(key)!;
    const row = await prisma.auteur.upsert({
      where: { prenom_nom: { prenom, nom } },
      update: { ...(email ? { email } : {}), ...(mutId ? { mutuelleId: mutId } : {}) },
      create: { prenom, nom, email: email || null, mutuelleId: mutId },
    });
    auteurId.set(key, row.id);
    return row.id;
  };

  const lastIdx = LIMIT ? Math.min(LIMIT, records.length) : records.length;

  for (let i = 0; i < lastIdx; i++) {
    const rec = records[i];
    const get = (key: string) => (rec[key] ?? "").trim();

    const titre = get(H.titre);
    const texte = get(H.texte);
    const code = get(H.code);
    if (!titre && !texte && !code) {
      report.skippedEmpty++;
      continue;
    }

    try {
      const mutId = await ensureMutuelle(get(H.mutuelle));
      const rubId = await ensureRubrique(get(H.rubrique));
      const fmtId = await ensureFormat(get(H.format));
      const { slug: etatSlug, id: etId } = resolveEtat(get(H.etat));

      const { prenom, nom } = splitAuteur(get(H.auteur), get(H.prenom));
      if (!prenom && !nom) report.missingAuteur++;
      const autId = await ensureAuteur(prenom, nom, get(H.email), mutId);

      const lienPhoto = get(H.lienPhoto);
      if (lienPhoto) report.withPhoto++;

      const contenu = texte || get(H.chapo) || titre || "(contenu vide)";
      if (!texte) report.missingContenu++;

      const nbRaw = get(H.nombreSignes).replace(/\D/g, "");
      const nombreSignes = nbRaw ? parseInt(nbRaw, 10) : NaN;

      const dateDepot = cellDates.get(i) ?? parseFrDate(get(H.horodateur));
      const datePublication = etatSlug === "publie" ? dateDepot : null;

      report.processed++;
      report.articles++;

      if (COMMIT) {
        if (!autId) {
          report.errors.push(`Ligne ${i + 2}: pas d'auteur, article ignoré ("${titre}").`);
          report.articles--;
          continue;
        }
        await prisma.article.create({
          data: {
            codeArticle: code || null,
            titre: titre || "(sans titre)",
            chapo: get(H.chapo) || null,
            contenu,
            legendePhoto: get(H.legendePhoto) || null,
            postRs: get(H.postRs) || null,
            lienPhoto: lienPhoto || null,
            lienGoogleDoc: get(H.lienArticle) || null,
            nombreSignes: Number.isFinite(nombreSignes) ? nombreSignes : null,
            dateDepot,
            datePublication,
            auteurId: autId,
            mutuelleId: mutId,
            rubriqueId: rubId,
            formatId: fmtId,
            etatId: etId,
          },
        });
      }
    } catch (e) {
      report.errors.push(`Ligne ${i + 2}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log("\n========== RAPPORT D'IMPORT ==========");
  console.log(`Lignes de données      : ${report.totalRows}`);
  console.log(`Lignes vides ignorées  : ${report.skippedEmpty}`);
  console.log(`Articles traités       : ${report.processed}`);
  console.log(`Articles à créer/créés : ${report.articles}`);
  console.log(`  dont avec photo      : ${report.withPhoto}`);
  console.log(`  sans contenu (texte) : ${report.missingContenu}`);
  console.log(`  sans auteur          : ${report.missingAuteur}`);
  console.log(`\nRéférentiels détectés :`);
  console.log(`  Mutuelles (${report.mutuelles.size}) : ${[...report.mutuelles].join(", ")}`);
  console.log(`  Rubriques (${report.rubriques.size}) : ${[...report.rubriques].join(", ")}`);
  console.log(`  Formats   (${report.formats.size}) : ${[...report.formats].join(", ")}`);
  console.log(`  États     (${report.etats.size}) : ${[...report.etats].join(", ")}`);
  console.log(`  Auteurs   (${report.auteurs.size})`);
  if (report.unknownEtat.size > 0)
    console.log(`\n⚠️  États NON mappés : ${[...report.unknownEtat].join(", ")}`);
  if (report.errors.length > 0) {
    console.log(`\n⚠️  Erreurs (${report.errors.length}) :`);
    report.errors.slice(0, 30).forEach((e) => console.log(`   - ${e}`));
    if (report.errors.length > 30) console.log(`   … (+${report.errors.length - 30})`);
  }
  console.log("\n======================================");
  console.log(
    COMMIT
      ? "Import COMMIT terminé. Étape suivante : npx tsx scripts/migrate-ibb-images.ts"
      : "DRY-RUN terminé. Relancer avec --commit pour écrire en base."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
