import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "../login/actions";
import SocialWorkspace from "./social-workspace";

export default async function SocialPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login?setup=1");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: drafts, error: draftLoadError } = await supabase
    .from("social_drafts")
    .select("id, platform, content, image_url, scheduled_for, status, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="回到首頁"><span className="brand-mark">d.</span><span>Doris 的工作台</span></Link>
        <div className="nav-label">工作空間</div>
        <nav className="nav-list" aria-label="主要導覽">
          <Link className="nav-item" href="/"><span>⌂</span>總覽</Link>
          <Link className="nav-item" href="/#notices"><span>◉</span>通知中心</Link>
          <Link className="nav-item" href="/#workflows"><span>⤳</span>工作流</Link>
          <Link className="nav-item active" href="/social"><span>✎</span>社群內容</Link>
        </nav>
        <div className="sidebar-bottom"><div className="avatar">D</div><div className="account-label"><strong>Doris</strong><small>{user.email}</small></div><form action={signOutAction}><button className="sign-out-button" type="submit">登出</button></form></div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div className="breadcrumb"><Link href="/">我的工作空間</Link><span>/</span>社群內容</div><div className="top-actions"><span className="secure-pill"><b /> 私人空間</span><Link className="profile-button" href="/" aria-label="回到首頁">D</Link></div></header>
        <div className="content social-content">
          <section className="welcome-row"><div><p className="eyebrow">SOCIAL WORKSPACE</p><h1>社群內容 <span>✦</span></h1><p className="subtitle">先用小秘書起草，也可以直接在下方手動編輯。</p></div></section>
          <div className="social-safety"><strong>草稿模式</strong><span>可分別保存 Facebook、Instagram、Threads、LINE 草稿。平台串接尚未全部完成；目前不會自動發布或啟動排程。</span></div>
          <SocialWorkspace initialDrafts={drafts ?? []} aiConfigured={Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL)} storageConfigured={!draftLoadError} makeConfigured={Boolean(process.env.MAKE_THREADS_APPROVAL_WEBHOOK_URL && process.env.MAKE_THREADS_APPROVAL_API_KEY)} makeSubmissionEnabled={process.env.MAKE_THREADS_SUBMISSIONS_ENABLED === "true"} />
        </div>
      </section>
    </main>
  );
}
