import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchApprovedDraft, getSocialPublishConfig, secureValueMatches } from "@/lib/social-publishing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!secureValueMatches(request.headers.get("x-doris-automation-key"), process.env.MAKE_SOCIAL_CALLBACK_SECRET)) {
    return NextResponse.json({ error: "未授權的自動化請求。" }, { status: 401 });
  }
  if (!getSocialPublishConfig()) return NextResponse.json({ error: "Make 發布情境尚未設定並啟用。" }, { status: 503 });
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Notion 核准資料格式不正確。" }, { status: 400 }); }
  const body = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const draftId = typeof body.draft_id === "string" ? body.draft_id : "";
  const notionPageId = typeof body.notion_page_id === "string" ? body.notion_page_id : "";
  if (!draftId && !notionPageId) return NextResponse.json({ error: "Notion 記錄缺少工作台草稿 ID 或 Notion 頁面 ID。" }, { status: 400 });

  let supabase;
  try { supabase = createAdminClient(); } catch { return NextResponse.json({ error: "後端資料庫連線尚未完成設定。" }, { status: 503 }); }
  let draftQuery = supabase.from("social_drafts").select("id, platform, content, image_url, scheduled_for, status, notion_page_id");
  draftQuery = draftId ? draftQuery.eq("id", draftId) : draftQuery.eq("notion_page_id", notionPageId);
  const { data: draft, error } = await draftQuery.maybeSingle();
  if (error || !draft) return NextResponse.json({ error: "找不到對應的工作台草稿。" }, { status: 404 });
  if (draft.status === "approved") {
    const dispatch = await dispatchApprovedDraft(draft, "notion");
    return dispatch.ok
      ? NextResponse.json({ status: "approved", already_approved: true, dispatched: true })
      : NextResponse.json({ error: dispatch.reason }, { status: 502 });
  }
  if (draft.status === "publishing" || draft.status === "published") {
    return NextResponse.json({ status: draft.status, already_processed: true });
  }
  if (draft.status !== "draft" && draft.status !== "awaiting_approval") return NextResponse.json({ error: "此草稿目前不能核准。" }, { status: 409 });
  if (draft.platform !== "Threads" && draft.platform !== "Instagram") return NextResponse.json({ error: "目前只支援 Threads 與 Instagram 發布。" }, { status: 400 });
  if (draft.platform === "Instagram" && !draft.image_url) return NextResponse.json({ error: "Instagram 照片貼文需要圖片網址。" }, { status: 400 });
  if (draft.scheduled_for && Date.parse(draft.scheduled_for) > Date.now()) return NextResponse.json({ error: "排程發布尚未接好；為避免提早發出，這筆未來排程沒有核准。" }, { status: 409 });

  const { data: approved, error: updateError } = await supabase.from("social_drafts")
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_via: "notion", publish_error: null, updated_at: new Date().toISOString() })
    .eq("id", draft.id).eq("status", draft.status)
    .select("id, platform, content, image_url, scheduled_for, status, notion_page_id").maybeSingle();
  if (updateError || !approved) return NextResponse.json({ error: "草稿已由另一處理核准；請查看目前狀態。" }, { status: 409 });

  const dispatch = await dispatchApprovedDraft(approved, "notion");
  if (!dispatch.ok) {
    await supabase.from("social_drafts").update({ status: draft.status, approved_at: null, approved_via: null, publish_error: dispatch.reason, updated_at: new Date().toISOString() })
      .eq("id", approved.id).eq("status", "approved");
    return NextResponse.json({ error: dispatch.reason }, { status: 502 });
  }
  return NextResponse.json({ status: "approved", message: "Notion 核准已記錄，Make 已收到發布工作。" });
}
