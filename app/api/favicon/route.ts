import { NextRequest, NextResponse } from "next/server";
import { getSiteLogoPayload } from "@/lib/siteBranding";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const payload = await getSiteLogoPayload();
  const targetUrl = payload.logoUrl || "/default-logo.svg";
  return NextResponse.redirect(new URL(targetUrl, request.url));
}
