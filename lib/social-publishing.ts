import { timingSafeEqual } from "node:crypto";

export type PublishDraft = {
  id: string;
  platform: string;
  content: string;
  image_url: string | null;
  scheduled_for: string | null;
  notion_page_id?: string | null;
};

export function secureValueMatches(received: string | null, expected: string | undefined) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function getSocialPublishConfig() {
  if (process.env.MAKE_SOCIAL_PUBLISH_ENABLED !== "true") return null;
  if (!process.env.MAKE_SOCIAL_CALLBACK_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const webhookUrl = process.env.MAKE_SOCIAL_PUBLISH_WEBHOOK_URL;
  const apiKey = process.env.MAKE_SOCIAL_PUBLISH_API_KEY;
  if (!webhookUrl || !apiKey) return null;
  try {
    const parsedUrl = new URL(webhookUrl);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "hook.us2.make.com") return null;
    return { parsedUrl, apiKey };
  } catch {
    return null;
  }
}

export async function dispatchApprovedDraft(draft: PublishDraft, approvedVia: "workbench" | "notion") {
  const config = getSocialPublishConfig();
  if (!config) return { ok: false as const, reason: "Make 發布流程尚未完成設定或啟用。" };
  try {
    const response = await fetch(config.parsedUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-make-apikey": config.apiKey },
      body: JSON.stringify({ event: "approved_to_publish", draft_id: draft.id, approved_via: approvedVia }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    return response.ok
      ? { ok: true as const }
      : { ok: false as const, reason: "Make 沒有確認收到發布工作。請檢查 Make 執行紀錄後再重試。" };
  } catch {
    return { ok: false as const, reason: "連線 Make 逾時，發布工作是否已收到不確定。請先檢查 Make 執行紀錄。" };
  }
}
