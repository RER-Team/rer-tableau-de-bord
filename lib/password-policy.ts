export const MIN_PASSWORD_LENGTH = 12;
/** Nombre minimal de classes de caractères distinctes requises. */
export const MIN_PASSWORD_CHARACTER_CLASSES = 2;

export function getPasswordPolicyMessage(): string {
  return (
    `Mot de passe invalide (minimum ${MIN_PASSWORD_LENGTH} caractères, ` +
    `au moins ${MIN_PASSWORD_CHARACTER_CLASSES} types de caractères parmi ` +
    `minuscules, majuscules, chiffres, symboles, et différent de votre email).`
  );
}

function countCharacterClasses(password: string): number {
  let classes = 0;
  if (/[a-z]/.test(password)) classes += 1;
  if (/[A-Z]/.test(password)) classes += 1;
  if (/[0-9]/.test(password)) classes += 1;
  if (/[^A-Za-z0-9]/.test(password)) classes += 1;
  return classes;
}

/**
 * Valide la robustesse d'un mot de passe.
 *
 * @param password mot de passe en clair
 * @param email    email associé (optionnel) : si fourni, le mot de passe ne
 *                 doit pas y être identique (insensible à la casse).
 */
export function isPasswordValid(password: string, email?: string | null): boolean {
  if (typeof password !== "string") return false;
  if (password.length < MIN_PASSWORD_LENGTH) return false;
  if (countCharacterClasses(password) < MIN_PASSWORD_CHARACTER_CLASSES) {
    return false;
  }
  if (email && password.trim().toLowerCase() === email.trim().toLowerCase()) {
    return false;
  }
  return true;
}
