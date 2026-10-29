import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("notifications")
    .select("id, category, title, detail, action_url, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: "Could not load notifications" }, { status: 500 });
  return NextResponse.json({ notifications: data });
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.MAKE_NOTIFICATION_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const ownerId = process.env.NOTIFICATION_OWNER_ID;

  if (!expectedSecret || !serviceRoleKey || !supabaseUrl || !ownerId) {
    return NextResponse.json({ error: "Notification intake is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventKey = typeof input.event_key === "string" ? input.event_key.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const detail = typeof input.detail === "string" ? input.detail.trim() : "";
  const actionUrl = typeof input.action_url === "string" ? input.action_url.trim() : "";

  if (!eventKey || eventKey.length > 200 || !category || category.length > 80 || !title || title.length > 200 || detail.length > 2000) {
    return NextResponse.json({ error: "Missing or invalid notification fields" }, { status: 400 });
  }
  if (actionUrl && !/^https:\/\//i.test(actionUrl)) {
    return NextResponse.json({ error: "Action URL must use HTTPS" }, { status: 400 });
  }

  const admin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.from("notifications").insert({
    user_id: ownerId,
    event_key: eventKey,
    category,
    title,
    detail,
    action_url: actionUrl || null,
  });

  // The service role is intentionally limited to INSERT on this table. Using
  // upsert with an explicit conflict target also requires SELECT on that key.
  // Keep event_key idempotent by treating a duplicate insert as already saved.
  if (error && error.code !== "23505") {
    return NextResponse.json({ error: "Could not save notification" }, { status: 500 });
  }
  return NextResponse.json({ received: true, duplicate: error?.code === "23505" }, { status: 202 });
}

