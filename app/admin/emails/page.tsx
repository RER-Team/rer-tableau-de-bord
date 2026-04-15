import { NotificationTemplatesAdmin } from "./templates-admin";

export const dynamic = "force-dynamic";

export default function AdminEmailsPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-rer-text">Emails & notifications</h1>
        <p className="mt-1 text-sm text-rer-muted">
          Personnalise les messages envoyes a chaque etape de l&apos;article.
        </p>
      </header>
      <NotificationTemplatesAdmin />
    </div>
  );
}
