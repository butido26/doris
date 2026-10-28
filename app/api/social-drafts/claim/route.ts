import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { secureValueMatches } from "@/lib/social-publishing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!secureValueMatches(request.headers.get("x-doris-automation-key"), process.env.MAKE_SOCIAL_CALLBACK_SECRET)) return NextResponse.json({ error: "未授權的自動化請求。" }, { status: 401 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "發布工作資料格式不正確。" }, { status: 400 }); }
  const body = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const draftId = typeof body.draft_id === "string" ? body.draft_id : "";
  if (!draftId) return NextResponse.json({ error: "缺少草稿 ID。" }, { status: 400 });
  let supabase;
  try { supabase = createAdminClient(); } catch { return NextResponse.json({ error: "後端資料庫連線尚未完成設定。" }, { status: 503 }); }
  const { data: draft, error } = await supabase.from("social_drafts")
    .update({ status: "publishing", updated_at: new Date().toISOString() })
    .eq("id", draftId).eq("status", "approved")
    .select("id, platform, content, image_url, scheduled_for, notion_page_id").maybeSingle();
  if (error) {
    console.error("Failed to claim social draft", { code: error.code, message: error.message, hint: error.hint });
    return NextResponse.json({ error: "無法取得發布工作。" }, { status: 503 });
  }
  if (!draft) return NextResponse.json({ error: "草稿已被處理或目前未核准，略過以防重複發布。" }, { status: 409 });
  return NextResponse.json({ draft });
}
