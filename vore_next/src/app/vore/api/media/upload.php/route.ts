import { randomUUID } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentSupabaseUser, json } from "@/features/legacy-vore/api";

const BUCKET = "vore-media";
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime"
]);

function extensionFor(file: File) {
  const byType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov"
  };
  const typed = byType[file.type];
  if (typed) return typed;
  const fromName = String(file.name || "").split(".").pop()?.toLowerCase() || "";
  return fromName.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
}

async function ensureBucket() {
  const admin = getSupabaseAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();

  if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: Array.from(ALLOWED_TYPES)
    });
  }

  return admin;
}

export async function POST(request: Request) {
  const { user } = await getCurrentSupabaseUser();

  if (!user) {
    return json({ ok: false, error: "Login necessario." }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return json({ ok: false, error: "Ficheiro obrigatorio." }, { status: 422 });
  }

  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return json({ ok: false, error: "Ficheiro demasiado grande." }, { status: 422 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ ok: false, error: "Tipo de ficheiro invalido." }, { status: 422 });
  }

  const context = String(formData?.get("context") || "media")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .slice(0, 40) || "media";
  const today = new Date().toISOString().slice(0, 10);
  const path = `${user.id}/${today}/${context}-${randomUUID()}.${extensionFor(file)}`;
  const admin = await ensureBucket();
  const bytes = await file.arrayBuffer();
  const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false
  });

  if (error) {
    return json({ ok: false, error: error.message || "Falha no upload." }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);

  return json({
    ok: true,
    bucket: BUCKET,
    path,
    url: data.publicUrl
  });
}
