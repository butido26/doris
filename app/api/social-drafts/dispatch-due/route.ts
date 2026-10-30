import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchApprovedDraft, getSocialPublishConfig, secureValueMatches } from "@/lib/social-publishing";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!secureValueMatches(request.headers.get("x-doris-automation-key"), process.env.MAKE_SOCIAL_CALLBACK_SECRET)) {
    return NextResponse.json({ error: "未授權的排程請求。" }, { status: 401 });
  }
  if (process.env.MAKE_SOCIAL_SCHEDULER_ENABLED !== "true") {
    return NextResponse.json({ error: "社群排程流程尚未啟用。" }, { status: 503 });
  }
  if (!getSocialPublishConfig()) {
    return NextResponse.json({ error: "Make 發布情境尚未設定並啟用。" }, { status: 503 });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json({ error: "後端資料庫連線尚未完成設定。" }, { status: 503 });
  }

  const now = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from("social_drafts")
    .select("id, platform, content, image_url, scheduled_for, approved_at, status, notion_page_id")
    .eq("status", "approved")
    .not("scheduled_for", "is", null)
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: "無法取得到期的核准草稿。" }, { status: 503 });

  // Only release posts approved no later than their scheduled time. This prevents
  // old, overdue drafts from being published just because the scheduler was enabled.
  const due = (rows ?? []).filter(
    (draft) => draft.approved_at && Date.parse(draft.approved_at) <= Date.parse(draft.scheduled_for!)
  );

  const results = await Promise.all(
    due.map(async (draft) => ({
      draft_id: draft.id,
      ...(await dispatchApprovedDraft(draft, "workbench")),
    }))
  );

  return NextResponse.json({
    scanned: rows?.length ?? 0,
    eligible: due.length,
    dispatched: results.filter((result) => result.ok).length,
    results,
  });
}
