"use client";

import { useEffect, useRef, useState } from "react";

type FocusedDraft = {
  /** Valeur courante du champ (état local). */
  draft: string;
  /** Met à jour la valeur locale (sur `onChange`). */
  setDraft: (next: string) => void;
  /** Marque le champ comme focalisé (sur `onFocus`). */
  onFocus: () => void;
  /** Valide la valeur si elle a changé puis défocalise (sur `onBlur`). */
  onBlur: () => void;
};

/**
 * Gère un champ « brouillon focalisé » : la valeur locale suit la prop tant que
 * le champ n'a pas le focus, et n'est validée (`onCommit`) qu'au blur si elle a
 * réellement changé. Évite que des mises à jour distantes écrasent une saisie
 * en cours.
 */
export function useFocusedDraft(
  value: string,
  onCommit: (next: string) => void
): FocusedDraft {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(value);
    }
  }, [value]);

  const onFocus = () => {
    focusedRef.current = true;
  };

  const onBlur = () => {
    focusedRef.current = false;
    if (value !== draft) {
      onCommit(draft);
    }
  };

  return { draft, setDraft, onFocus, onBlur };
}
