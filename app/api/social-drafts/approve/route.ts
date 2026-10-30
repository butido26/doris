import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { dispatchApprovedDraft, getSocialPublishConfig } from "@/lib/social-publishing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入再核准發布。" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "請從工作台核准草稿。" }, { status: 403 });
  const ownerId = process.env.NOTIFICATION_OWNER_ID;
  if (!ownerId || user.id !== ownerId) return NextResponse.json({ error: "目前帳號沒有核准發布的權限。" }, { status: 403 });

  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "草稿資料格式不正確。" }, { status: 400 }); }
  const body = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const draftId = typeof body.draft_id === "string" ? body.draft_id : "";
  if (!draftId) return NextResponse.json({ error: "找不到要核准的草稿。" }, { status: 400 });

  const { data: draft, error } = await supabase.from("social_drafts")
    .select("id, platform, content, image_url, scheduled_for, status")
    .eq("id", draftId).eq("user_id", user.id).maybeSingle();
  if (error || !draft) return NextResponse.json({ error: "找不到這筆草稿，請重新整理。" }, { status: 404 });
  if (draft.platform !== "Threads" && draft.platform !== "Instagram") return NextResponse.json({ error: "目前只支援 Threads 與 Instagram 發布。" }, { status: 400 });
  if (draft.platform === "Instagram" && !draft.image_url) return NextResponse.json({ error: "Instagram 照片貼文需要圖片網址。" }, { status: 400 });
  if (draft.scheduled_for && Date.parse(draft.scheduled_for) > Date.now() && process.env.MAKE_SOCIAL_SCHEDULER_ENABLED !== "true") {
    return NextResponse.json({ error: "社群排程流程尚未啟用，草稿沒有變更。" }, { status: 503 });
  }
  if (draft.status !== "draft" && draft.status !== "awaiting_approval") return NextResponse.json({ error: "此草稿已核准或正在處理，請勿重複操作。" }, { status: 409 });

  const { data: approved, error: updateError } = await supabase.from("social_drafts")
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_via: "workbench", publish_error: null, updated_at: new Date().toISOString() })
    .eq("id", draft.id).eq("user_id", user.id).eq("status", draft.status)
    .select("id, platform, content, image_url, scheduled_for, status, notion_page_id").maybeSingle();
  if (updateError || !approved) return NextResponse.json({ error: "草稿狀態已改變，請重新整理確認，避免重複發布。" }, { status: 409 });

  if (approved.scheduled_for && Date.parse(approved.scheduled_for) > Date.now()) {
    return NextResponse.json({ status: "approved", scheduled: true, message: "工作台已核准，草稿會保留到排程時間再交給 Make 發布。" });
  }

  const dispatch = await dispatchApprovedDraft(approved, "workbench");
  if (!dispatch.ok) {
    await supabase.from("social_drafts").update({ status: draft.status, approved_at: null, approved_via: null, publish_error: dispatch.reason, updated_at: new Date().toISOString() })
      .eq("id", approved.id).eq("user_id", user.id).eq("status", "approved");
    return NextResponse.json({ error: `${dispatch.reason} 草稿已恢復原狀，請完成連線後再核准。` }, { status: 502 });
  }
  return NextResponse.json({ status: "approved", message: "工作台已核准，Make 已收到發布工作。" });
}

