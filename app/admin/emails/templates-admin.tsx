"use client";

import { useEffect, useMemo, useState } from "react";

type TemplateItem = {
  eventType: string;
  emailSubject: string;
  emailText: string;
  emailHtml: string;
  inAppTitle: string;
  inAppBody: string;
  pushTitle: string;
  pushBody: string;
};

const eventLabels: Record<string, string> = {
  "article.submitted": "Depot auteur (a relire)",
  "article.corrections_requested_or_resubmitted":
    "Corrections / re-soumission",
  "article.published": "Publication",
};

const emptyTemplate: TemplateItem = {
  eventType: "",
  emailSubject: "",
  emailText: "",
  emailHtml: "",
  inAppTitle: "",
  inAppBody: "",
  pushTitle: "",
  pushBody: "",
};

export function NotificationTemplatesAdmin() {
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [activeEventType, setActiveEventType] = useState<string>("");
  const [draft, setDraft] = useState<TemplateItem>(emptyTemplate);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError(null);
      const response = await fetch("/api/admin/emails/templates", {
        cache: "no-store",
      });
      if (!response.ok) {
        setError("Impossible de charger les templates.");
        return;
      }
      const payload = (await response.json()) as { items?: TemplateItem[] };
      const nextItems = payload.items ?? [];
      setItems(nextItems);
      if (nextItems.length > 0) {
        setActiveEventType(nextItems[0].eventType);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const current = items.find((item) => item.eventType === activeEventType);
    setDraft(current ?? emptyTemplate);
  }, [activeEventType, items]);

  const hasActiveTemplate = useMemo(
    () => Boolean(items.find((item) => item.eventType === activeEventType)),
    [activeEventType, items]
  );
  const hasUnsavedChanges = useMemo(() => {
    const current = items.find((item) => item.eventType === activeEventType);
    if (!current) return false;
    return (
      current.emailSubject !== draft.emailSubject ||
      current.emailText !== draft.emailText ||
      current.emailHtml !== draft.emailHtml ||
      current.inAppTitle !== draft.inAppTitle ||
      current.inAppBody !== draft.inAppBody ||
      current.pushTitle !== draft.pushTitle ||
      current.pushBody !== draft.pushBody
    );
  }, [activeEventType, draft, items]);

  const updateField = (key: keyof TemplateItem, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!activeEventType) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    const response = await fetch(`/api/admin/emails/templates/${activeEventType}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Sauvegarde impossible.");
      setSaving(false);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.eventType === activeEventType ? { ...draft } : item))
    );
    setFeedback("Template enregistre.");
    setSaving(false);
  };

  const resetToDefault = async () => {
    if (!activeEventType) return;
    setSaving(true);
    setError(null);
    setFeedback(null);
    const response = await fetch(`/api/admin/emails/templates/${activeEventType}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetToDefault: true }),
    });
    const payload = (await response.json()) as TemplateItem & { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Reset impossible.");
      setSaving(false);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.eventType === activeEventType ? payload : item))
    );
    setFeedback("Template remis par defaut.");
    setSaving(false);
  };

  return (
    <section className="space-y-4 rounded-xl border border-rer-border bg-white p-4">
      <p className="text-xs text-rer-subtle">
        Variables autorisees: {"{{articleTitle}}"}, {"{{articleUrl}}"}
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => {
          const active = item.eventType === activeEventType;
          return (
            <button
              key={item.eventType}
              type="button"
              onClick={() => setActiveEventType(item.eventType)}
              className={`rounded-lg border px-3 py-2 text-left text-sm ${
                active
                  ? "border-rer-blue bg-rer-blue/5 text-rer-text"
                  : "border-rer-border bg-white text-rer-muted"
              }`}
            >
              {eventLabels[item.eventType] ?? item.eventType}
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {feedback && <p className="text-sm text-green-700">{feedback}</p>}
      {hasActiveTemplate && hasUnsavedChanges && (
        <p className="text-xs text-amber-700">Modifications non enregistrées.</p>
      )}

      {hasActiveTemplate && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-rer-text">Sujet email</span>
            <input
              className="mt-1 w-full rounded border border-rer-border px-2 py-1 text-sm"
              value={draft.emailSubject}
              onChange={(event) => updateField("emailSubject", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-rer-text">Corps email (texte)</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded border border-rer-border px-2 py-1 text-sm"
              value={draft.emailText}
              onChange={(event) => updateField("emailText", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-rer-text">Corps email (HTML)</span>
            <textarea
              className="mt-1 min-h-24 w-full rounded border border-rer-border px-2 py-1 text-sm"
              value={draft.emailHtml}
              onChange={(event) => updateField("emailHtml", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-rer-text">Titre notification in-app</span>
            <input
              className="mt-1 w-full rounded border border-rer-border px-2 py-1 text-sm"
              value={draft.inAppTitle}
              onChange={(event) => updateField("inAppTitle", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-rer-text">Message notification in-app</span>
            <textarea
              className="mt-1 min-h-20 w-full rounded border border-rer-border px-2 py-1 text-sm"
              value={draft.inAppBody}
              onChange={(event) => updateField("inAppBody", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-rer-text">Titre notification navigateur</span>
            <input
              className="mt-1 w-full rounded border border-rer-border px-2 py-1 text-sm"
              value={draft.pushTitle}
              onChange={(event) => updateField("pushTitle", event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-rer-text">Message notification navigateur</span>
            <textarea
              className="mt-1 min-h-20 w-full rounded border border-rer-border px-2 py-1 text-sm"
              value={draft.pushBody}
              onChange={(event) => updateField("pushBody", event.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="rounded bg-rer-blue px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Enregistrer comme modèle
            </button>
            <button
              type="button"
              onClick={() => void resetToDefault()}
              disabled={saving}
              className="rounded border border-rer-border px-3 py-1.5 text-sm font-medium text-rer-text disabled:opacity-60"
            >
              Reset par defaut
            </button>
          </div>
          <p className="text-xs text-rer-muted">
            Ce message remplace le modèle actif pour cet événement.
          </p>
        </div>
      )}
    </section>
  );
}
