import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { secureValueMatches } from "@/lib/social-publishing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!secureValueMatches(request.headers.get("x-doris-automation-key"), process.env.MAKE_SOCIAL_CALLBACK_SECRET)) return NextResponse.json({ error: "未授權的自動化請求。" }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "發佈結果格式不正確。" }, { status: 400 }); }
  const body = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const draftId = typeof body.draft_id === "string" ? body.draft_id : "";
  const result = body.result === "published" || body.result === "failed" ? body.result : null;
  const postId = typeof body.platform_post_id === "string" ? body.platform_post_id.slice(0, 300) : null;
  const publishedUrl = typeof body.published_url === "string" && /^https:\/\//i.test(body.published_url) ? body.published_url.slice(0, 2048) : null;
  const errorMessage = typeof body.error === "string" ? body.error.slice(0, 1000) : null;
  if (!draftId || !result) return NextResponse.json({ error: "缺少草稿 ID 或有效發佈結果。" }, { status: 400 });
  if (result === "published" && !postId && !publishedUrl) return NextResponse.json({ error: "成功結果需附平台貼文 ID 或公開貼文網址。" }, { status: 400 });
  let supabase;
  try { supabase = createAdminClient(); } catch { return NextResponse.json({ error: "後端資料庫連線尚未完成設定。" }, { status: 503 }); }
  const now = new Date().toISOString();
  const updates = result === "published"
    ? { status: "published", published_at: now, platform_post_id: postId, published_url: publishedUrl, publish_error: null, updated_at: now }
    : { status: "failed", publish_error: errorMessage || "Make 回報發布失敗。", updated_at: now };
  const { data, error } = await supabase.from("social_drafts").update(updates).eq("id", draftId).eq("status", "publishing").select("id, status").maybeSingle();
  if (error) return NextResponse.json({ error: "發佈結果無法寫回工作台。" }, { status: 503 });
  if (!data) return NextResponse.json({ error: "草稿不是發布中狀態，結果未套用。" }, { status: 409 });
  return NextResponse.json({ draft_id: data.id, status: data.status });
}
