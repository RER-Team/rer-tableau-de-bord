"use client";

import { createClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET } from "./storage-bucket";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Avertissement côté client pour faciliter le debug en dev.
  console.warn(
    "[supabase-client] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant."
  );
}

export const supabaseClient =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export const SUPABASE_STORAGE_BUCKET = STORAGE_BUCKET;

