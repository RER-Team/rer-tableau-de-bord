import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

type CliOptions = {
  applyToAllUsers: boolean;
  dryRun: boolean;
};

function parseOptions(args: string[]): CliOptions {
  return {
    applyToAllUsers: args.includes("--all"),
    dryRun: args.includes("--dry-run"),
  };
}

function buildTemporaryPassword(): string {
  return `Tmp-${randomBytes(24).toString("base64url")}!aA1`;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const where = options.applyToAllUsers ? {} : { passwordHash: null };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, role: true, passwordHash: true },
    orderBy: { email: "asc" },
  });

  if (users.length === 0) {
    console.log("Aucun utilisateur a traiter.");
    return;
  }

  const temporaryPassword = buildTemporaryPassword();
  const temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 10);

  console.log(
    `[temp-passwords] ${users.length} utilisateur(s) cible(s) | mode=${
      options.dryRun ? "dry-run" : "apply"
    } | scope=${options.applyToAllUsers ? "all" : "missing-hash-only"}`
  );

  if (options.dryRun) {
    for (const user of users) {
      console.log(
        `[temp-passwords] DRY RUN -> ${user.email} (${user.role}) hash=${
          user.passwordHash ? "present" : "missing"
        }`
      );
    }
    return;
  }

  const result = await prisma.user.updateMany({
    where,
    data: { passwordHash: temporaryPasswordHash },
  });

  console.log(`[temp-passwords] ${result.count} utilisateur(s) mis a jour.`);
  console.log(
    "[temp-passwords] Mot de passe temporaire unique configure. Les utilisateurs doivent utiliser 'Mot de passe oublie' pour en choisir un nouveau."
  );
}

main()
  .catch((error) => {
    console.error("[temp-passwords] Echec:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
