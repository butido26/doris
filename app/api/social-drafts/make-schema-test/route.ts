import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入再測試 Make 連線。" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "請從工作台啟動 Make 連線測試。" }, { status: 403 });
  }
  const ownerId = process.env.NOTIFICATION_OWNER_ID;
  if (!ownerId || user.id !== ownerId) {
    return NextResponse.json({ error: "目前帳號沒有執行此測試的權限。" }, { status: 403 });
  }

  const webhookUrl = process.env.MAKE_THREADS_APPROVAL_WEBHOOK_URL;
  const apiKey = process.env.MAKE_THREADS_APPROVAL_API_KEY;
  if (!webhookUrl || !apiKey) {
    return NextResponse.json({ error: "Make 入口尚未完成伺服器設定。" }, { status: 503 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(webhookUrl);
  } catch {
    return NextResponse.json({ error: "Make 入口網址設定不正確。" }, { status: 503 });
  }
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "hook.us2.make.com") {
    return NextResponse.json({ error: "Make 入口網址必須是受信任的 HTTPS Make 網址。" }, { status: 503 });
  }

  try {
    const response = await fetch(parsedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-make-apikey": apiKey },
      body: JSON.stringify({
        draft_id: "schema-detection-test",
        content: "欄位偵測測試貼文（不會發布）",
        image_url: null,
        scheduled_for: "2026-10-24T03:00:00.000Z",
        is_test: true,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Make 沒有接受測試資料，請確認 Webhook 正在等待偵測。" }, { status: 502 });
    }
    return NextResponse.json({ received: true, test_only: true });
  } catch {
    return NextResponse.json({ error: "連線 Make 逾時或失敗，請確認 Webhook 正在等待偵測。" }, { status: 502 });
  }
}

