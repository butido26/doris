import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTOMATION_API_PATHS = new Set([
  "/api/social-drafts/claim",
  "/api/social-drafts/publish-result",
  "/api/social-drafts/notion-intake",
  "/api/social-drafts/notion-approve",
]);

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  const isNotificationApi = pathname === "/api/notifications";
  const isAutomationApi = AUTOMATION_API_PATHS.has(pathname);

  // These webhook routes authenticate with their own server-side shared secret.
  // Let each handler verify that secret instead of redirecting Make to /login HTML.
  if (isNotificationApi || isAutomationApi) return NextResponse.next({ request });

  if (!url || !key) {
    if (isLoginPage) return NextResponse.next({ request });
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "?setup=1";
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const isPublicRoute = isLoginPage || pathname.startsWith("/auth/");
  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }
  if (user && isLoginPage) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    const redirectResponse = NextResponse.redirect(homeUrl);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }
  return response;
}
