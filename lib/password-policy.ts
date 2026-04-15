export const MIN_PASSWORD_LENGTH = 12;

export function getPasswordPolicyMessage(): string {
  return `Mot de passe invalide (minimum ${MIN_PASSWORD_LENGTH} caractères)`;
}

export function isPasswordValid(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
