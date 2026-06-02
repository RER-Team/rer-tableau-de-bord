import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { RelecteursSidebar } from "../../relecteurs/RelecteursSidebar";

export default async function AdminSettingsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    redirect("/admin/articles");
  }

  return (
    <div className="flex min-h-screen bg-rer-app">
      <RelecteursSidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
          <div className="min-w-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
