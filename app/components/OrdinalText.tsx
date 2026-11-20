import { Fragment } from "react";
import { findOrdinals } from "@/lib/ordinals";

/**
 * Affiche un texte brut (titre, chapô) avec les ordinaux en exposant
 * (« 2e » -> 2<sup>e</sup>). Le texte stocké n'est pas modifié.
 */
export function OrdinalText({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  const matches = findOrdinals(text);
  if (!matches.length) return <>{text}</>;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start < cursor) return;
    nodes.push(
      <Fragment key={i}>
        {text.slice(cursor, m.start)}
        {m.number}
        <sup>{m.suffix}</sup>
      </Fragment>
    );
    cursor = m.end;
  });
  nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
