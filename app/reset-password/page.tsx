"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-policy";

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Lien invalide : token manquant.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
      );
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Impossible de réinitialiser le mot de passe.");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setError("Erreur réseau, veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-rer-border">
        <h1 className="text-lg font-semibold text-rer-text">
          Réinitialiser le mot de passe
        </h1>
        <p className="mt-1 text-sm text-rer-muted">
          Saisissez votre nouveau mot de passe (minimum {MIN_PASSWORD_LENGTH}{" "}
          caractères).
        </p>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && (
          <p className="mt-3 text-sm text-green-700">
            Mot de passe mis à jour. Redirection vers la connexion…
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium uppercase tracking-wide text-rer-muted"
            >
              Nouveau mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-rer-border bg-white px-3 py-2 text-sm text-rer-text shadow-sm focus:border-rer-blue focus:outline-none focus:ring-1 focus:ring-rer-blue"
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-medium uppercase tracking-wide text-rer-muted"
            >
              Confirmer le mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-rer-border bg-white px-3 py-2 text-sm text-rer-text shadow-sm focus:border-rer-blue focus:outline-none focus:ring-1 focus:ring-rer-blue"
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-rer-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1e3380] disabled:opacity-60"
          >
            {loading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
          </button>
        </form>

        <p className="mt-4 text-xs text-rer-subtle">
          <Link href="/login" className="text-rer-blue hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
