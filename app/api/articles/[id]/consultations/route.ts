import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  isValidConsultationSource,
  recordArticleConsultation,
} from "@/lib/article-consultations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id: articleId } = await params;
  let body: { source?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const source = body.source ?? "";
  if (!isValidConsultationSource(source)) {
    return NextResponse.json({ error: "Source invalide" }, { status: 400 });
  }

  const result = await recordArticleConsultation({
    articleId,
    userId: user.id,
    source,
  });

  return NextResponse.json({ ok: true, recorded: result.recorded });
}
