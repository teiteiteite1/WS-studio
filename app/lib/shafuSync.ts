"use client";

import type { PersonalSession } from "./personalSync";

const SUPABASE_URL = "https://udjpqsmihauksbceaxww.supabase.co";
const SUPABASE_KEY = "sb_publishable_vNHL7xgpDLBfYhTblDQUZg_us4Xbnss";
const BUCKET = "shafu-media";

export type ShafuAsset = {
  id: string;
  user_id: string;
  project_id: string | null;
  episode_id: string | null;
  kind: "reference" | "completed_video";
  bucket_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  tag: string;
  created_at: string;
  signed_url?: string;
};

function headers(session: PersonalSession, extra?: HeadersInit) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${session.access_token}`,
    ...extra,
  };
}

async function parseError(response: Response, fallback: string) {
  const raw = await response.text();
  try {
    const data = raw ? JSON.parse(raw) : {};
    return data?.message || data?.msg || data?.error || data?.hint || fallback;
  } catch {
    return raw || fallback;
  }
}

export async function loadShafuWorkspace<T>(session: PersonalSession) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/shafu_workspaces?select=data,revision,updated_at&user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`,
    { headers: headers(session), cache: "no-store", signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error(await parseError(response, "SHAFUの保存データを読み込めませんでした。"));
  const rows = (await response.json()) as Array<{ data: T; revision: number; updated_at: string }>;
  return rows[0] || null;
}

export async function saveShafuWorkspace<T>(session: PersonalSession, data: T, revision: number) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/shafu_workspaces?on_conflict=user_id`, {
    method: "POST",
    headers: headers(session, {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    }),
    body: JSON.stringify([{ user_id: session.user.id, data, revision, updated_at: new Date().toISOString() }]),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(await parseError(response, "SHAFUを保存できませんでした。"));
  const rows = (await response.json()) as Array<{ revision: number; updated_at: string }>;
  return rows[0] || { revision, updated_at: new Date().toISOString() };
}

export async function listShafuAssets(session: PersonalSession) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/shafu_assets?select=*&order=created_at.desc`,
    { headers: headers(session), cache: "no-store", signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error(await parseError(response, "素材を読み込めませんでした。"));
  const assets = (await response.json()) as ShafuAsset[];
  const withUrls = await Promise.all(assets.map(async (asset) => ({ ...asset, signed_url: await signAsset(session, asset.bucket_path).catch(() => "") })));
  return withUrls;
}

export async function signAsset(session: PersonalSession, path: string) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${encoded}`, {
    method: "POST",
    headers: headers(session, { "Content-Type": "application/json" }),
    body: JSON.stringify({ expiresIn: 3600 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(await parseError(response, "素材URLを作れませんでした。"));
  const data = await response.json();
  const signed = String(data?.signedURL || data?.signedUrl || "");
  return signed.startsWith("http") ? signed : `${SUPABASE_URL}/storage/v1${signed}`;
}

function safeFileName(name: string) {
  const dot = name.lastIndexOf(".");
  const extension = dot >= 0 ? name.slice(dot).toLowerCase().replace(/[^a-z0-9.]/g, "") : "";
  return `${crypto.randomUUID()}${extension.slice(0, 12)}`;
}

export async function uploadShafuAsset(
  session: PersonalSession,
  file: File,
  details: { kind: ShafuAsset["kind"]; projectId?: string | null; episodeId?: string | null; tag?: string },
) {
  const path = `${session.user.id}/${details.kind}/${safeFileName(file.name)}`;
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const upload = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encoded}`, {
    method: "POST",
    headers: headers(session, { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" }),
    body: file,
    signal: AbortSignal.timeout(120000),
  });
  if (!upload.ok) throw new Error(await parseError(upload, "ファイルをアップロードできませんでした。"));

  const row = {
    user_id: session.user.id,
    project_id: details.projectId || null,
    episode_id: details.episodeId || null,
    kind: details.kind,
    bucket_path: path,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    tag: details.tag || "",
  };
  const metadata = await fetch(`${SUPABASE_URL}/rest/v1/shafu_assets`, {
    method: "POST",
    headers: headers(session, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(15000),
  });
  if (!metadata.ok) {
    await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encoded}`, { method: "DELETE", headers: headers(session) }).catch(() => undefined);
    throw new Error(await parseError(metadata, "素材情報を保存できませんでした。"));
  }
  const rows = (await metadata.json()) as ShafuAsset[];
  const asset = rows[0];
  return { ...asset, signed_url: await signAsset(session, asset.bucket_path) };
}

export async function deleteShafuAsset(session: PersonalSession, asset: ShafuAsset) {
  const encoded = asset.bucket_path.split("/").map(encodeURIComponent).join("/");
  const objectResponse = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encoded}`, {
    method: "DELETE",
    headers: headers(session),
    signal: AbortSignal.timeout(20000),
  });
  if (!objectResponse.ok && objectResponse.status !== 404) throw new Error(await parseError(objectResponse, "素材を削除できませんでした。"));
  const rowResponse = await fetch(`${SUPABASE_URL}/rest/v1/shafu_assets?id=eq.${encodeURIComponent(asset.id)}`, {
    method: "DELETE",
    headers: headers(session),
    signal: AbortSignal.timeout(15000),
  });
  if (!rowResponse.ok) throw new Error(await parseError(rowResponse, "素材情報を削除できませんでした。"));
}
