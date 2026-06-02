import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStatusWhereClause } from "@/lib/article-status";
import { publicArticleDetailSelect } from "@/lib/public-article-select";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const article = await prisma.article.findFirst({
    where: {
      id,
      isExemplePublic: true,
      etat: getStatusWhereClause("publie"),
    },
    select: publicArticleDetailSelect,
  });

  if (!article) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  return NextResponse.json(article);
}
