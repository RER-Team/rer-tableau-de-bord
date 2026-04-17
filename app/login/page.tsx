"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { useSiteLogo } from "@/lib/useSiteLogo";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotForm, setShowForgotForm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const { logoUrl, fallbackLogoUrl } = useSiteLogo();
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logoUrl]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
        callbackUrl,
      });
      if (!result) {
        setError("Erreur inconnue.");
      } else if (result.error) {
        setError("Identifiants invalides.");
      } else if (result.url) {
        router.push(result.url);
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError("Erreur lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  const presetError = searchParams.get("error");

  const handleForgotPassword = async () => {
    setForgotMessage(null);
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json().catch(() => ({}));
      setForgotMessage(
        data.message ||
          data.error ||
          "Impossible d'envoyer le lien de réinitialisation."
      );
      if (res.ok && data.message) {
        setForgotEmail("");
      }
    } catch {
      setForgotMessage(
        "Erreur réseau: impossible d'envoyer le lien de réinitialisation."
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-rer-border">
        <div className="mb-4 flex justify-center">
          <div className="relative h-16 w-36">
            <Image
              key={logoLoadFailed ? fallbackLogoUrl : logoUrl}
              src={logoLoadFailed ? fallbackLogoUrl : logoUrl}
              alt="Logo RER"
              fill
              className="object-contain"
              unoptimized
              onError={() => setLogoLoadFailed(true)}
              priority
            />
          </div>
        </div>
        <h1 className="text-lg font-semibold text-rer-text">
          Connexion à la banque de contenus
        </h1>
        <p className="mt-1 text-sm text-rer-muted">
          Saisissez vos identifiants pour accéder aux articles et à l’espace
          d’administration.
        </p>

        {(error || presetError) && (
          <p className="mt-3 text-sm text-red-600">
            {error || "Identifiants invalides ou session expirée."}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium uppercase tracking-wide text-rer-muted"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-rer-border bg-white px-3 py-2 text-sm text-rer-text shadow-sm focus:border-rer-blue focus:outline-none focus:ring-1 focus:ring-rer-blue"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium uppercase tracking-wide text-rer-muted"
            >
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-rer-border bg-white px-3 py-2 text-sm text-rer-text shadow-sm focus:border-rer-blue focus:outline-none focus:ring-1 focus:ring-rer-blue"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-rer-blue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1e3380] disabled:opacity-60"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForgotForm((v) => !v);
                setForgotMessage(null);
              }}
              className="text-xs font-medium text-rer-blue hover:underline"
            >
              {showForgotForm
                ? "Masquer le formulaire de récupération"
                : "Mot de passe oublié ?"}
            </button>
          </div>

          {showForgotForm && (
            <div className="rounded-lg border border-rer-border bg-rer-app/40 p-3">
              <p className="mb-2 text-xs text-rer-muted">
                Saisissez votre email pour recevoir un lien de réinitialisation.
              </p>
              <div className="space-y-2">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-lg border border-rer-border bg-white px-3 py-2 text-sm text-rer-text shadow-sm focus:border-rer-blue focus:outline-none focus:ring-1 focus:ring-rer-blue"
                  placeholder="vous@exemple.fr"
                  required
                />
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                  className="inline-flex w-full items-center justify-center rounded-full border border-rer-blue bg-white px-4 py-2 text-sm font-semibold text-rer-blue hover:bg-rer-app disabled:opacity-60"
                >
                  {forgotLoading ? "Envoi…" : "Envoyer le lien"}
                </button>
              </div>
              {forgotMessage && (
                <p className="mt-2 text-xs text-rer-muted">{forgotMessage}</p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

