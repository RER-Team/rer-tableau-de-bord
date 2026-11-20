import { describe, expect, it } from "vitest";
import {
  applyOrdinalsToHtml,
  applyOrdinalsToText,
  unwrapOrdinalSuperscripts,
} from "@/lib/ordinals";
import { sanitizeArticleHtml } from "@/lib/sanitizeArticleHtml";

const t = applyOrdinalsToText;

describe("exposants des ordinaux : chiffres arabes", () => {
  it.each([
    ["le 1er janvier", "le 1<sup>er</sup> janvier"],
    ["la 1re fois", "la 1<sup>re</sup> fois"],
    ["les 1ers inscrits", "les 1<sup>ers</sup> inscrits"],
    ["les 1res places", "les 1<sup>res</sup> places"],
    ["au 2e étage", "au 2<sup>e</sup> étage"],
    ["les 3es rencontres", "les 3<sup>es</sup> rencontres"],
    ["la 20e édition.", "la 20<sup>e</sup> édition."],
    ["(2e)", "(2<sup>e</sup>)"],
  ])("%s", (input, expected) => {
    expect(t(input)).toBe(expected);
  });

  it.each([
    ["le 2ème étage", "le 2<sup>e</sup> étage"],
    ["les 2èmes", "les 2<sup>es</sup>"],
    ["le 2è jour", "le 2<sup>e</sup> jour"],
    ["la 1ère fois", "la 1<sup>re</sup> fois"],
    ["les 1ères", "les 1<sup>res</sup>"],
  ])("normalise la forme fautive %s", (input, expected) => {
    expect(t(input)).toBe(expected);
  });

  it.each([
    "B2e",
    "page2e",
    "2e5",
    "2etage",
    "#3e3e3e",
    "12 euros",
    "2 e",
    "un risque de 1e-5",
    "site.fr/2e-edition",
    "#2e",
    "v1.2e",
  ])("ne touche pas %s", (input) => {
    expect(t(input)).toBe(input);
  });
});

describe("exposants des ordinaux : chiffres romains", () => {
  it.each([
    ["au XIXe siècle", "au XIX<sup>e</sup> siècle"],
    ["le Ier siècle", "le I<sup>er</sup> siècle"],
    ["le XVe arrondissement", "le XV<sup>e</sup> arrondissement"],
    ["XIXe et XXe siècles", "XIX<sup>e</sup> et XX<sup>e</sup> siècles"],
    ["du XVIIe au XVIIIe siècle", "du XVII<sup>e</sup> au XVIII<sup>e</sup> siècle"],
    ["le XIXème siècle", "le XIX<sup>e</sup> siècle"],
    ["XXIe&nbsp;siècle", "XXI<sup>e</sup>&nbsp;siècle"],
  ])("%s", (input, expected) => {
    expect(t(input)).toBe(expected);
  });

  it.each([
    "Ce siècle a vu",
    "Le siècle dernier",
    "De siècle en siècle",
    "la IVe République",
    "Ve",
    "XIXe",
    "les XIXe siéclistes",
  ])("ne touche pas %s", (input) => {
    expect(t(input)).toBe(input);
  });
});

describe("exposants des ordinaux dans du HTML", () => {
  it("transforme le texte sans toucher aux attributs", () => {
    expect(
      applyOrdinalsToHtml('<p>Le 2e <img src="/img/2e.png" alt="2e"> rang</p>')
    ).toBe('<p>Le 2<sup>e</sup> <img src="/img/2e.png" alt="2e"> rang</p>');
  });

  it("ne touche pas le texte des liens, du code ni des exposants existants", () => {
    const html =
      '<p><a href="/x">le 2e lien</a> <code>2e</code> 1<sup>er</sup> puis 3e</p>';
    expect(applyOrdinalsToHtml(html)).toBe(
      '<p><a href="/x">le 2e lien</a> <code>2e</code> 1<sup>er</sup> puis 3<sup>e</sup></p>'
    );
  });

  it("reprend après la fermeture d'une balise ignorée", () => {
    expect(applyOrdinalsToHtml("<p><a>1er</a> 2e</p>")).toBe(
      "<p><a>1er</a> 2<sup>e</sup></p>"
    );
  });

  it("gère une chaîne vide", () => {
    expect(applyOrdinalsToHtml("")).toBe("");
  });
});

describe("stockage des ordinaux", () => {
  it("le sanitizer remet les ordinaux en texte simple (recherche)", () => {
    expect(sanitizeArticleHtml("<p>Au XIX<sup>e</sup> siècle, le 1<sup>er</sup></p>")).toBe(
      "<p>Au XIXe siècle, le 1er</p>"
    );
  });

  it("conserve les autres exposants (appels de note)", () => {
    expect(unwrapOrdinalSuperscripts("note<sup>1</sup> et m<sup>2</sup>")).toBe(
      "note<sup>1</sup> et m<sup>2</sup>"
    );
  });

  it("ne coupe pas une balise sur un « > » dans un attribut", () => {
    expect(applyOrdinalsToHtml('<img alt="Avant > 2e édition"> 2e')).toBe(
      '<img alt="Avant > 2e édition"> 2<sup>e</sup>'
    );
  });
});
