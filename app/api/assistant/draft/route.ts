import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入再使用小秘書。" }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) return NextResponse.json({ error: "AI 文案服務尚未完成設定。請先在 Vercel 加入伺服器端 AI 金鑰與模型名稱。" }, { status: 503 });

  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "請求格式不正確。" }, { status: 400 }); }
  const instruction = typeof input === "object" && input !== null && "instruction" in input && typeof input.instruction === "string" ? input.instruction.trim() : "";
  if (!instruction || instruction.length > 3000) return NextResponse.json({ error: "指令不可空白，且最多 3000 個字元。" }, { status: 400 });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        instructions: "你是 Doris 的社群文案助理。根據她的指令，產生一則繁體中文 Threads 貼文草稿。只輸出貼文文案，不要加上解說或引號。不要捏造產品功效、價格、成分、折扣、上市日期或其他未提供的事實；資訊不足時，用保守表述，不得自行補造。絕不可代表使用者核准、排程或發布貼文。",
        input: instruction,
        max_output_tokens: 500,
      }),
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: "AI 服務暫時無法產生文案，請稍後再試或手動編寫。" }, { status: 502 });
    const responseText = typeof data.output_text === "string"
      ? data.output_text
      : Array.isArray(data.output)
        ? data.output.flatMap((item: { type?: string; content?: Array<{ type?: string; text?: string }> }) => item.type === "message" ? (item.content ?? []).filter((part) => part.type === "output_text").map((part) => part.text ?? "") : []).join("\n")
        : "";
    const text = responseText.trim();
    if (!text) return NextResponse.json({ error: "AI 沒有回傳文案，請換個方式描述需求。" }, { status: 502 });
    return NextResponse.json({ content: text });
  } catch {
    return NextResponse.json({ error: "連線 AI 服務逾時或失敗，請稍後再試。" }, { status: 502 });
  }
}
