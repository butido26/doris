import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { secureValueMatches } from "@/lib/social-publishing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!secureValueMatches(request.headers.get("x-doris-automation-key"), process.env.MAKE_SOCIAL_CALLBACK_SECRET)) return NextResponse.json({ error: "未授權的自動化請求。" }, { status: 401 });
  const ownerId = process.env.NOTIFICATION_OWNER_ID;
  if (!ownerId) return NextResponse.json({ error: "後端帳號設定尚未完成。" }, { status: 503 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Notion 草稿資料格式不正確。" }, { status: 400 }); }
  const body = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const pageId = typeof body.notion_page_id === "string" ? body.notion_page_id.trim() : "";
  const platform = typeof body.platform === "string" ? body.platform : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : "";
  const scheduledFor = typeof body.scheduled_for === "string" ? body.scheduled_for : null;
  const approval = body.approval_status === "awaiting_approval" ? "awaiting_approval" : "draft";
  if (!pageId || pageId.length > 200) return NextResponse.json({ error: "Notion 頁面 ID 不正確。" }, { status: 400 });
  if (!["Threads", "Instagram"].includes(platform)) return NextResponse.json({ error: "目前只支援 Threads 與 Instagram。" }, { status: 400 });
  if (!content || content.length > 5000) return NextResponse.json({ error: "文案不可空白，且最多 5000 個字元。" }, { status: 400 });
  if (imageUrl && (imageUrl.length > 2048 || !/^https:\/\//i.test(imageUrl))) return NextResponse.json({ error: "圖片網址必須是有效的 HTTPS 網址。" }, { status: 400 });
  if (scheduledFor && (!Number.isFinite(Date.parse(scheduledFor)) || Date.parse(scheduledFor) <= Date.now())) return NextResponse.json({ error: "排程時間必須是未來時間。" }, { status: 400 });

  let supabase;
  try { supabase = createAdminClient(); } catch { return NextResponse.json({ error: "後端資料庫連線尚未完成設定。" }, { status: 503 }); }
  const { data: existing, error: lookupError } = await supabase.from("social_drafts")
    .select("id, status").eq("notion_page_id", pageId).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "無法查詢對應的工作台草稿。" }, { status: 503 });
  if (existing && existing.status !== "draft" && existing.status !== "awaiting_approval") {
    return NextResponse.json({ error: "此 Notion 項目已核准或發布，為避免覆蓋紀錄，不能再同步成草稿。" }, { status: 409 });
  }
  const values = { user_id: ownerId, platform, content, image_url: imageUrl || null, scheduled_for: scheduledFor, status: approval, updated_at: new Date().toISOString() };
  const query = existing
    ? supabase.from("social_drafts").update(values).eq("id", existing.id).in("status", ["draft", "awaiting_approval"])
    : supabase.from("social_drafts").insert({ ...values, notion_page_id: pageId });
  const { data: draft, error } = await query.select("id, platform, content, image_url, scheduled_for, status, created_at").maybeSingle();
  if (error || !draft) return NextResponse.json({ error: "Notion 草稿沒有同步成功，請檢查 Make 執行紀錄。" }, { status: 503 });
  return NextResponse.json({ draft_id: draft.id, status: draft.status });
}
