import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { NotificationPreferencesClient } from "./NotificationPreferencesClient";

export const dynamic = "force-dynamic";

export default async function NotificationPreferencesPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login");
  }

  return (
    <main>
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <header>
          <h1 className="text-2xl font-extrabold text-rer-text">Preferences</h1>
          <p className="mt-1 text-sm text-rer-muted">
            Configurez vos notifications email, interface et navigateur.
          </p>
        </header>
        <NotificationPreferencesClient />
      </div>
    </main>
  );
}
