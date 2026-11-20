import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { findOrdinals } from "@/lib/ordinals";

/**
 * Affiche les ordinaux en exposant dans l'éditeur (« 2e », « 1er », « XIXe
 * siècle »), avec les mêmes règles que la lecture (lib/ordinals.ts).
 *
 * Purement visuel : ce sont des décorations, le document n'est pas modifié.
 * Le HTML enregistré reste « 2e », ce qui garde la recherche texte intacte.
 * Le suffixe saisi est affiché tel quel (« 2ème » montre « ème » en exposant) ;
 * la forme normalisée « 2e » n'apparaît qu'à la lecture et à l'export.
 */

const ordinalPluginKey = new PluginKey("ordinalDecorations");

// Pas d'exposant dans le code ni dans le texte des liens, comme à la lecture.
const SKIP_MARKS = new Set(["code", "link", "superscript"]);

function buildDecorations(doc: ProseMirrorNode): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "codeBlock") return false;
    if (!node.isText || !node.text) return true;
    if (node.marks.some((mark) => SKIP_MARKS.has(mark.type.name))) return false;
    for (const m of findOrdinals(node.text)) {
      const from = pos + m.start + m.number.length;
      const to = pos + m.end;
      if (to > from) {
        decorations.push(Decoration.inline(from, to, { class: "ordinal-sup" }));
      }
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

export const OrdinalDecorations = Extension.create({
  name: "ordinalDecorations",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: ordinalPluginKey,
        state: {
          init: (_, { doc }) => buildDecorations(doc),
          apply: (tr, old) => (tr.docChanged ? buildDecorations(tr.doc) : old),
        },
        props: {
          decorations(state) {
            return ordinalPluginKey.getState(state);
          },
        },
      }),
    ];
  },
});
