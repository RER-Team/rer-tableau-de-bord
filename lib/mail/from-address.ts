/**
 * Construit l'adresse d'expéditeur en combinant un nom d'affichage optionnel
 * avec l'adresse email de base. Si `baseFrom` est déjà au format
 * "Nom <email>", seule l'adresse est extraite pour appliquer `fromName`.
 */
export function resolveFromAddress(baseFrom: string, fromName?: string): string {
  if (!fromName?.trim()) return baseFrom;
  const extracted = baseFrom.match(/<([^>]+)>/);
  const address = (extracted?.[1] ?? baseFrom).trim();
  return `${fromName.trim()} <${address}>`;
}
