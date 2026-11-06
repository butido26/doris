import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { secureValueMatches } from "@/lib/social-publishing";

export const dynamic = "force-dynamic";

/**
 * Link the Notion row created by the Make intake scenario to the existing
 * workbench draft. This keeps the workbench draft ID stable for the publish
 * router and its later Notion writeback.
 */
export async function POST(request: NextRequest) {
  if (
    !secureValueMatches(
      request.headers.get("x-doris-automation-key"),
      process.env.MAKE_SOCIAL_CALLBACK_SECRET,
    )
  ) {
    return NextResponse.json({ error: "未授權的自動化請求。" }, { status: 401 });
  }

  const ownerId = process.env.NOTIFICATION_OWNER_ID;
  if (!ownerId) {
    return NextResponse.json({ error: "後端帳號設定尚未完成。" }, { status: 503 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Notion 關聯資料格式不正確。" }, { status: 400 });
  }

  const body = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const draftId = typeof body.draft_id === "string" ? body.draft_id.trim() : "";
  const notionPageId = typeof body.notion_page_id === "string" ? body.notion_page_id.trim() : "";

  if (!draftId || draftId.length > 200 || !notionPageId || notionPageId.length > 200) {
    return NextResponse.json({ error: "缺少有效的工作台草稿 ID 或 Notion 頁面 ID。" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json({ error: "後端資料庫連線尚未完成設定。" }, { status: 503 });
  }

  const { data: draft, error: lookupError } = await supabase
    .from("social_drafts")
    .select("id, status, notion_page_id")
    .eq("id", draftId)
    .eq("user_id", ownerId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: "無法查詢工作台草稿。" }, { status: 503 });
  }
  if (!draft) {
    return NextResponse.json({ error: "找不到此工作台草稿。" }, { status: 404 });
  }

  if (draft.notion_page_id === notionPageId) {
    return NextResponse.json({ draft_id: draft.id, notion_page_id: notionPageId, linked: true });
  }
  if (draft.notion_page_id) {
    return NextResponse.json({ error: "此草稿已連結另一筆 Notion 資料，為避免覆蓋而停止。" }, { status: 409 });
  }

  const { data: linkedDraft, error: updateError } = await supabase
    .from("social_drafts")
    .update({ notion_page_id: notionPageId, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("user_id", ownerId)
    .is("notion_page_id", null)
    .select("id, notion_page_id")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: "Notion 資料列 ID 無法寫回工作台。" }, { status: 503 });
  }
  if (!linkedDraft) {
    return NextResponse.json({ error: "草稿關聯狀態剛有變更，請重新整理確認。" }, { status: 409 });
  }

  return NextResponse.json({
    draft_id: linkedDraft.id,
    notion_page_id: linkedDraft.notion_page_id,
    linked: true,
  });
}
