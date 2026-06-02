import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { getSessionUser } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type doit être multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier envoyé (attendu: champ 'file')" },
        { status: 400 }
      );
    }

    const name = (file.name ?? "").toLowerCase();
    if (!name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Le fichier doit être au format .docx" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 10 Mo)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const fullText = (result.value ?? "").trim();

    if (!fullText) {
      return NextResponse.json(
        { titre: undefined, chapo: undefined, contenu: "" },
        { status: 200 }
      );
    }

    // Découpage : première ligne ou paragraphe = titre, deuxième = chapo, reste = contenu
    const paragraphs = fullText
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    let titre: string | undefined;
    let chapo: string | undefined;
    let contenu: string;

    if (paragraphs.length === 0) {
      contenu = fullText;
    } else if (paragraphs.length === 1) {
      titre = paragraphs[0].length > 200 ? undefined : paragraphs[0];
      chapo = undefined;
      contenu = paragraphs[0];
    } else if (paragraphs.length === 2) {
      titre = paragraphs[0].length <= 200 ? paragraphs[0] : undefined;
      chapo = paragraphs[1].length <= 500 ? paragraphs[1] : undefined;
      contenu = fullText;
    } else {
      titre = paragraphs[0].length <= 200 ? paragraphs[0] : undefined;
      chapo = paragraphs[1].length <= 500 ? paragraphs[1] : undefined;
      contenu = fullText;
    }

    return NextResponse.json({
      titre,
      chapo,
      contenu,
    });
  } catch (e) {
    console.error("Import Word error:", e);
    return NextResponse.json(
      { error: "Impossible de lire le fichier Word." },
      { status: 500 }
    );
  }
}
