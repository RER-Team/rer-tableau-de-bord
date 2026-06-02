"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  role: string;
  auteurId: string | null;
};

type Auteur = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  mutuelleId: string | null;
};

type Mutuelle = {
  id: string;
  nom: string;
};

type DataResponse = {
  users: User[];
  auteurs: Auteur[];
  mutuelles: Mutuelle[];
};

const ROLES = ["admin", "relecteur", "auteur", "lecteur"];

export default function AdminUsersPage() {
  const [data, setData] = useState<DataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("auteur");
  const [newPrenom, setNewPrenom] = useState("");
  const [newNom, setNewNom] = useState("");
  const [newMutuelleId, setNewMutuelleId] = useState<string | "">("");

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) {
          throw new Error("Erreur de chargement");
        }
        const json = (await res.json()) as DataResponse;
        setData(json);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger les utilisateurs.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const refresh = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) return;
      const json = (await res.json()) as DataResponse;
      setData(json);
    } catch {
      // silencieux
    }
  };

  const handleCreate = async () => {
    if (!newEmail.trim() || !newPrenom.trim() || !newNom.trim() || !newMutuelleId) {
      setError("Prénom, nom, email et mutuelle sont obligatoires pour créer un utilisateur.");
      return;
    }
    setSavingId("new");
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          role: newRole,
          prenom: newPrenom.trim(),
          nom: newNom.trim(),
          mutuelleId: newMutuelleId || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur lors de la création");
      }
      setNewEmail("");
      setNewRole("auteur");
      setNewPrenom("");
      setNewNom("");
      setNewMutuelleId("");
      await refresh();
    } catch (e: any) {
      setError(e.message || "Erreur lors de la création");
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdate = async (user: User, patch: Partial<User>) => {
    setSavingId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur lors de la mise à jour");
      }
      await refresh();
    } catch (e: any) {
      setError(e.message || "Erreur lors de la mise à jour");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Supprimer l’utilisateur ${user.email} ?`)) return;
    setSavingId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur lors de la suppression");
      }
      await refresh();
    } catch (e: any) {
      setError(e.message || "Erreur lors de la suppression");
    } finally {
      setSavingId(null);
    }
  };

  const auteurLabel = (id: string | null) => {
    if (!id || !data) return "—";
    const a = data.auteurs.find((x) => x.id === id);
    if (!a) return "—";
    const m = data.mutuelles.find((m) => m.id === a.mutuelleId);
    return m ? `${a.prenom} ${a.nom} (${m.nom})` : `${a.prenom} ${a.nom}`;
  };

  const getAuteur = (id: string | null) => {
    if (!id) return null;
    return data?.auteurs.find((a) => a.id === id) ?? null;
  };

  const updateAuteur = async (
    auteurId: string,
    patch: Partial<{
      prenom: string;
      nom: string;
      mutuelleId: string | null;
      telephone: string | null;
    }>
  ) => {
    setSavingId(`auteur-${auteurId}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/auteurs/${auteurId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur lors de la mise à jour de la personne");
      }
      await refresh();
    } catch (e: any) {
      setError(e.message || "Erreur lors de la mise à jour de la personne");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-rer-border">
        <h1 className="text-lg font-semibold text-rer-text">
          Gestion des utilisateurs
        </h1>
        <p className="text-sm text-rer-muted">Chargement…</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-rer-border">
        <h1 className="text-lg font-semibold text-rer-text">
          Gestion des utilisateurs
        </h1>
        <p className="text-sm text-red-600">
          {error || "Impossible de charger les données."}
        </p>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-rer-border">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-rer-text">
          Utilisateurs & rôles
        </h1>
        <p className="text-sm text-rer-muted">
          Créer, modifier et supprimer les comptes, définir les rôles et gérer
          directement les personnes (prénom, nom, mutuelle) associées.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="space-y-2 rounded-lg bg-rer-app p-3 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-rer-muted">
          Nouvel utilisateur
        </h2>
        <div className="flex flex-wrap items-stretch gap-2 sm:items-center">
          <input
            type="text"
            placeholder="Prénom"
            value={newPrenom}
            onChange={(e) => setNewPrenom(e.target.value)}
            className="h-8 w-full rounded border border-rer-border bg-white px-2 text-sm sm:w-24"
          />
          <input
            type="text"
            placeholder="Nom"
            value={newNom}
            onChange={(e) => setNewNom(e.target.value)}
            className="h-8 w-full rounded border border-rer-border bg-white px-2 text-sm sm:w-28"
          />
          <input
            type="email"
            placeholder="email@exemple.org"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="h-8 w-full rounded border border-rer-border bg-white px-2 text-sm sm:w-auto sm:min-w-[200px]"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="h-8 w-full rounded border border-rer-border bg-white px-2 text-sm sm:w-auto"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={newMutuelleId}
            onChange={(e) => setNewMutuelleId(e.target.value)}
            className="h-8 w-full rounded border border-rer-border bg-white px-2 text-sm sm:w-auto sm:min-w-[180px]"
          >
            <option value="">Mutuelle…</option>
            {data.mutuelles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleCreate}
            disabled={savingId === "new"}
            className="inline-flex w-full items-center justify-center rounded-full bg-rer-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3380] disabled:opacity-60 sm:w-auto"
          >
            {savingId === "new" ? "Création…" : "Ajouter"}
          </button>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-rer-border text-sm">
          <thead className="bg-rer-app text-xs font-semibold uppercase tracking-wide text-rer-muted">
            <tr>
              <th className="w-[30%] px-2 py-2 text-left">Personne</th>
              <th className="w-[16%] px-2 py-2 text-left">Mutuelle</th>
              <th className="w-[12%] px-2 py-2 text-left">Téléphone</th>
              <th className="w-[20%] px-2 py-2 text-left">Email</th>
              <th className="w-[10%] px-2 py-2 text-left">Rôle</th>
              <th className="w-[12%] px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rer-border bg-white">
            {data.users.map((u) => (
              <tr key={u.id} className="hover:bg-rer-app/60">
                <td className="px-2 py-1.5 align-top">
                  {u.auteurId && getAuteur(u.auteurId) ? (
                    (() => {
                      const a = getAuteur(u.auteurId)!;
                      return (
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <select
                              value={u.auteurId ?? ""}
                              onChange={(e) => {
                                const value = e.target.value || null;
                                if (value !== u.auteurId) {
                                  handleUpdate(u, { auteurId: value });
                                }
                              }}
                            className="h-7 w-full min-w-0 rounded border border-rer-border bg-white px-2 text-xs"
                            >
                              <option value="">Aucun auteur associé</option>
                              {data.auteurs.map((auteur) => (
                                <option key={auteur.id} value={auteur.id}>
                                  {auteur.prenom} {auteur.nom}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleUpdate(u, { auteurId: null })}
                              className="text-[11px] font-medium text-rer-muted hover:text-rer-text"
                            >
                              Délier
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                          <input
                            type="text"
                            defaultValue={a.prenom}
                            onBlur={(e) =>
                              e.target.value !== a.prenom &&
                              updateAuteur(a.id, { prenom: e.target.value })
                            }
                            className="h-7 w-24 rounded border border-transparent px-1 py-0.5 text-xs hover:border-rer-border focus:border-rer-blue focus:outline-none"
                          />
                          <input
                            type="text"
                            defaultValue={a.nom}
                            onBlur={(e) =>
                              e.target.value !== a.nom &&
                              updateAuteur(a.id, { nom: e.target.value })
                            }
                            className="h-7 w-28 rounded border border-transparent px-1 py-0.5 text-xs hover:border-rer-border focus:border-rer-blue focus:outline-none"
                          />
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-1">
                      <p className="text-xs text-rer-subtle">
                        Aucun auteur associé.
                      </p>
                      <select
                        value=""
                        onChange={(e) => {
                          const value = e.target.value || null;
                          if (value) {
                            handleUpdate(u, { auteurId: value });
                          }
                        }}
                        className="h-7 w-full min-w-0 rounded border border-rer-border bg-white px-2 text-xs"
                      >
                        <option value="">Associer un auteur…</option>
                        {data.auteurs.map((auteur) => (
                          <option key={auteur.id} value={auteur.id}>
                            {auteur.prenom} {auteur.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </td>
                <td className="px-2 py-1.5 align-top">
                  {u.auteurId && getAuteur(u.auteurId) ? (
                    (() => {
                      const a = getAuteur(u.auteurId)!;
                      return (
                        <select
                          defaultValue={a.mutuelleId || ""}
                          onChange={(e) =>
                            updateAuteur(a.id, {
                              mutuelleId: e.target.value || null,
                            })
                          }
                          className="h-8 rounded border border-rer-border bg-white px-2 text-xs"
                        >
                          <option value="">Mutuelle…</option>
                          {data.mutuelles.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.nom}
                            </option>
                          ))}
                        </select>
                      );
                    })()
                  ) : (
                    <span className="text-xs text-rer-subtle">—</span>
                  )}
                </td>
                <td className="px-2 py-1.5 align-top">
                  {u.auteurId && getAuteur(u.auteurId) ? (
                    (() => {
                      const a = getAuteur(u.auteurId)!;
                      return (
                        <input
                          type="tel"
                          defaultValue={a.telephone || ""}
                          onBlur={(e) =>
                            e.target.value !== (a.telephone || "") &&
                            updateAuteur(a.id, {
                              telephone: e.target.value || null,
                            })
                          }
                          className="h-8 w-full min-w-0 rounded border border-transparent px-1 py-0.5 text-xs hover:border-rer-border focus:border-rer-blue focus:outline-none"
                          placeholder="06..."
                        />
                      );
                    })()
                  ) : (
                    <span className="text-xs text-rer-subtle">—</span>
                  )}
                </td>
                <td className="px-2 py-1.5 align-top">
                  <input
                    type="email"
                    defaultValue={u.email}
                    onBlur={(e) =>
                      e.target.value !== u.email &&
                      handleUpdate(u, { email: e.target.value })
                    }
                    className="w-full min-w-0 rounded border border-transparent px-1 py-0.5 text-sm hover:border-rer-border focus:border-rer-blue focus:outline-none"
                  />
                </td>
                <td className="px-2 py-1.5 align-top">
                  <select
                    defaultValue={u.role}
                    onChange={(e) =>
                      e.target.value !== u.role &&
                      handleUpdate(u, { role: e.target.value })
                    }
                    className="h-8 w-full min-w-0 rounded border border-rer-border bg-white px-2 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5 text-right align-top">
                  <div className="flex flex-col items-end gap-1">
                    <button
                    type="button"
                    disabled={savingId === `reset-${u.id}`}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Réinitialiser le mot de passe de ${u.email} ?`
                        )
                      ) {
                        return;
                      }
                      const newPassword = Math.random()
                        .toString(36)
                        .slice(-10);
                      setSavingId(`reset-${u.id}`);
                      setError(null);
                      try {
                        const res = await fetch(
                          `/api/admin/users/${u.id}/reset-password`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ password: newPassword }),
                          }
                        );
                        if (!res.ok) {
                          const json = await res.json().catch(() => ({}));
                          throw new Error(
                            json.error ||
                              "Erreur lors de la réinitialisation du mot de passe"
                          );
                        }
                        window.alert(
                          `Nouveau mot de passe pour ${u.email} : ${newPassword}`
                        );
                      } catch (e: any) {
                        setError(
                          e.message ||
                            "Erreur lors de la réinitialisation du mot de passe"
                        );
                      } finally {
                        setSavingId(null);
                      }
                    }}
                    className="text-xs font-medium text-rer-blue hover:text-rer-text disabled:opacity-60"
                    >
                      Réinit. MDP
                    </button>
                    <button
                    type="button"
                    disabled={savingId === u.id}
                    onClick={() => handleDelete(u)}
                    className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

