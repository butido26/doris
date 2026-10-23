import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function makeWebhookConfig() {
  const webhookUrl = process.env.MAKE_THREADS_APPROVAL_WEBHOOK_URL;
  const apiKey = process.env.MAKE_THREADS_APPROVAL_API_KEY;
  if (!webhookUrl || !apiKey) return null;
  try {
    const parsedUrl = new URL(webhookUrl);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "hook.us2.make.com") return null;
    return { parsedUrl, apiKey };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入再送交審核。" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "請從工作台送交草稿。" }, { status: 403 });
  }

  if (process.env.MAKE_THREADS_SUBMISSIONS_ENABLED !== "true") {
    return NextResponse.json({ error: "送審流程尚在設定中，目前不會傳送你的草稿。" }, { status: 503 });
  }

  const ownerId = process.env.NOTIFICATION_OWNER_ID;
  if (!ownerId || user.id !== ownerId) {
    return NextResponse.json({ error: "目前帳號沒有送交此流程的權限。" }, { status: 403 });
  }

  const config = makeWebhookConfig();
  if (!config) return NextResponse.json({ error: "Make 入口尚未完成伺服器設定。" }, { status: 503 });

  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "草稿資料格式不正確。" }, { status: 400 }); }
  const body = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const draftId = typeof body.draft_id === "string" ? body.draft_id : "";
  if (!draftId) return NextResponse.json({ error: "找不到要送交的草稿。" }, { status: 400 });

  const { data: draft, error: readError } = await supabase
    .from("social_drafts")
    .select("id, platform, content, image_url, scheduled_for, status")
    .eq("id", draftId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readError || !draft) return NextResponse.json({ error: "找不到這筆草稿，請重新整理後再試。" }, { status: 404 });
  if (draft.platform !== "Threads" && draft.platform !== "Instagram") {
    return NextResponse.json({ error: "目前只支援 Threads 與 Instagram 草稿送審。" }, { status: 400 });
  }
  if (draft.status !== "draft") return NextResponse.json({ error: "這筆草稿已送交或處理中，請勿重複送出。" }, { status: 409 });

  const { data: claimedDraft, error: claimError } = await supabase
    .from("social_drafts")
    .update({ status: "awaiting_approval" })
    .eq("id", draft.id)
    .eq("user_id", user.id)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();
  if (claimError || !claimedDraft) return NextResponse.json({ error: "這筆草稿已被送交處理，請重新整理確認狀態。" }, { status: 409 });

  try {
    const response = await fetch(config.parsedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-make-apikey": config.apiKey },
      body: JSON.stringify({
        draft_id: draft.id,
        platform: draft.platform,
        content: draft.content,
        image_url: draft.image_url,
        scheduled_for: draft.scheduled_for,
        is_test: false,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "草稿已標記送審，但 Make 沒有確認收件；請先檢查 Make 與 Notion，避免重複送出。" }, { status: 502 });
    }
    return NextResponse.json({ submitted: true, status: "awaiting_approval" });
  } catch {
    return NextResponse.json({ error: "草稿已標記送審，但連線結果不確定；請先檢查 Make 與 Notion，避免重複送出。" }, { status: 502 });
  }
}
