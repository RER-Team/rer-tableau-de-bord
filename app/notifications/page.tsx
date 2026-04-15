import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { NotificationsClient } from "./NotificationsClient";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login");
  }

  return (
    <main>
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <header>
          <h1 className="text-2xl font-extrabold text-rer-text">Notifications</h1>
          <p className="mt-1 text-sm text-rer-muted">
            Retrouvez ici les alertes liées au cycle de vos articles.
          </p>
        </header>
        <NotificationsClient />
      </div>
    </main>
  );
}
