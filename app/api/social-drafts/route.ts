import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入再保存草稿。" }, { status: 401 });

  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "草稿格式不正確。" }, { status: 400 }); }
  const body = typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const imageUrl = typeof body.image_url === "string" ? body.image_url.trim() : "";
  const scheduledFor = typeof body.scheduled_for === "string" ? body.scheduled_for : null;

  if (!content || content.length > 5000) return NextResponse.json({ error: "文案不可空白，且最多 5000 個字元。" }, { status: 400 });
  if (imageUrl && (imageUrl.length > 2048 || !/^https:\/\//i.test(imageUrl))) return NextResponse.json({ error: "圖片網址必須是有效的 HTTPS 網址。" }, { status: 400 });
  if (scheduledFor && (!Number.isFinite(Date.parse(scheduledFor)) || Date.parse(scheduledFor) <= Date.now())) return NextResponse.json({ error: "希望發布時間必須是未來時間。" }, { status: 400 });

  const { data: draft, error } = await supabase.from("social_drafts").insert({
    user_id: user.id,
    platform: "Threads",
    content,
    image_url: imageUrl || null,
    scheduled_for: scheduledFor,
    status: "draft",
  }).select("id, platform, content, image_url, scheduled_for, status, created_at").single();

  if (error) return NextResponse.json({ error: "草稿未能保存。請確認 Supabase 的社群草稿資料表已建立，然後再試。" }, { status: 503 });
  return NextResponse.json({ draft }, { status: 201 });
}
