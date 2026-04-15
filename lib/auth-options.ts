import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "./prisma";
import { computePasswordSessionVersion } from "./password-session";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: string;
      auteurId?: string | null;
    };
    /** Présent quand on simule un autre utilisateur : permet d’afficher le footer et "Revenir à mon compte" */
    originalUserId?: string | null;
    originalUserEmail?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    auteurId?: string | null;
    originalUserId?: string | null;
    originalUserEmail?: string | null;
    passwordVersion?: string;
  }
}

const baseCredentialsProvider = CredentialsProvider({
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Mot de passe", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) return null;
    const email = credentials.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user?.passwordHash) return null;
    const ok = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!ok) return null;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      auteurId: user.auteurId,
      passwordVersion: computePasswordSessionVersion(user.passwordHash),
    };
  },
});

const providers: NextAuthOptions["providers"] = [baseCredentialsProvider];

const enableImpersonate = process.env.NEXTAUTH_ENABLE_IMPERSONATE === "1";

// Provider d'impersonation pour la phase de bêta, activable uniquement
// via variable d'environnement serveur.
if (enableImpersonate) {
  providers.push(
    CredentialsProvider({
      id: "impersonate",
      name: "Impersonation (beta)",
      credentials: {
        email: { label: "Email", type: "email" },
        originalUserEmail: { label: "Original email", type: "text" },
        originalUserId: { label: "Original user id", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user) return null;
        const out: Record<string, unknown> = {
          id: user.id,
          email: user.email,
          role: user.role,
          auteurId: user.auteurId,
          passwordVersion: computePasswordSessionVersion(user.passwordHash),
        };
        // Si on a l’admin d’origine, on est en train de “simuler” → on garde la trace pour le footer
        if (credentials.originalUserEmail?.trim()) {
          out._originalUserEmail = credentials.originalUserEmail.trim();
          out._originalUserId = credentials.originalUserId?.trim() || null;
        }
        return out as typeof user & { _originalUserEmail?: string; _originalUserId?: string | null };
      },
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "auteur";
        token.auteurId = (user as { auteurId?: string | null }).auteurId;
        const u = user as { _originalUserEmail?: string; _originalUserId?: string | null };
        token.originalUserEmail = u._originalUserEmail ?? null;
        token.originalUserId = u._originalUserId ?? null;
        token.passwordVersion =
          (user as { passwordVersion?: string }).passwordVersion ??
          token.passwordVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.auteurId = token.auteurId;
      }
      session.originalUserEmail = token.originalUserEmail ?? null;
      session.originalUserId = token.originalUserId ?? null;
      return session;
    },
  },
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};

