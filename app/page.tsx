import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/login/actions";

const workflows = [
  { icon: "◎", name: "社群內容", description: "LINE、Threads、Instagram 圖文草稿與發布核准", status: "規劃中" },
  { icon: "▥", name: "廣告分析", description: "Google Ads 成效報告與優化建議，只分析、不直接修改", status: "規劃中" },
  { icon: "♡", name: "生活紀錄", description: "保養品庫存、運動紀錄與體態筆記入口", status: "待連結" },
];

export default async function Home() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login?setup=1");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, category, title, detail, action_url, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(10);
  const unreadCount = notifications?.filter((notice) => !notice.read_at).length ?? 0;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="回到首頁">
          <span className="brand-mark">d.</span>
          <span>Doris 的工作台</span>
        </a>
        <div className="nav-label">工作空間</div>
        <nav className="nav-list" aria-label="主要導覽">
          <a className="nav-item active" href="#home"><span>⌂</span>總覽</a>
          <a className="nav-item" href="#notices"><span>◉</span>通知中心 {unreadCount > 0 && <i>{unreadCount}</i>}</a>
          <a className="nav-item" href="#workflows"><span>⤳</span>工作流</a>
          <a className="nav-item" href="/social"><span>✎</span>社群內容</a>
          <a className="nav-item" href="#ads"><span>▥</span>廣告分析</a>
        </nav>
        <div className="nav-label personal-label">個人生活</div>
        <nav className="nav-list" aria-label="個人生活導覽">
          <a className="nav-item" href="#life"><span>♡</span>生活紀錄</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">D</div>
          <div className="account-label"><strong>Doris</strong><small>{user.email}</small></div>
          <form action={signOutAction}><button className="sign-out-button" type="submit">登出</button></form>
        </div>
      </aside>

      <section className="main-panel" id="home">
        <header className="topbar">
          <div className="breadcrumb">我的工作空間 <span>/</span> 總覽</div>
          <div className="top-actions"><span className="secure-pill"><b /> 私人空間</span><button className="profile-button" aria-label="個人設定">D</button></div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div>
              <p className="eyebrow">WEDNESDAY, OCTOBER 21</p>
              <h1>早安，Doris <span>✦</span></h1>
              <p className="subtitle">今天想先處理哪件事？你的工作流都在這裡。</p>
            </div>
            <div className="today-card"><span className="sun-icon">☼</span><div><small>今天的工作台</small><strong>準備就緒</strong></div></div>
          </section>

          <section className="assistant-card" aria-label="AI 指令介面">
            <div className="assistant-orb">✦</div>
            <div className="assistant-copy"><span className="section-kicker">AI 工作小幫手</span><h2>用一句話開始一項工作</h2><p>例如：幫我整理本週廣告成效，或草擬一則 Threads 貼文。</p></div>
            <a className="assistant-button" href="/social">開始對話 <span>↗</span></a>
            <div className="coming-soon">先建立草稿 · AI 金鑰設定後可生成文案</div>
          </section>

          <section className="section-block" id="notices">
            <div className="section-heading"><div><span className="section-kicker">需要你留意</span><h2>通知中心 <span className="count">{unreadCount}</span></h2></div></div>
            <div className="notice-list">
              {notifications?.length ? notifications.map((notice) => (
                <article className="notice-card" key={notice.id}>
                  <div className="notice-icon">↗</div>
                  <div className="notice-content"><span className="notice-category">{notice.category}</span><h3>{notice.title}</h3><p>{notice.detail}</p>{notice.action_url && <a className="notice-action" href={notice.action_url} target="_blank" rel="noreferrer">前往 Notion 處理 →</a>}</div>
                  <div className="notice-side"><span className="status-tag">{notice.read_at ? "已讀" : "待處理"}</span><small>{new Date(notice.created_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</small></div>
                </article>
              )) : <div className="empty-notices">目前沒有新通知。Make 串接完成後，新留言會顯示在這裡。</div>}
            </div>
          </section>

          <section className="section-block" id="workflows">
            <div className="section-heading"><div><span className="section-kicker">你的自動化</span><h2>工作流</h2></div><button className="outline-button" disabled title="工作流串接完成後即可從這裡管理">＋ 新增工作流</button></div>
            <div className="workflow-grid">
              {workflows.map((workflow) => (
                <article className="workflow-card" key={workflow.name} id={workflow.name === "社群內容" ? "social" : workflow.name === "廣告分析" ? "ads" : "life"}>
                  <div className="workflow-top"><span className="workflow-icon">{workflow.icon}</span><span className="workflow-status"><b />{workflow.status}</span></div>
                  <h3>{workflow.name}</h3><p>{workflow.description}</p><a className="workflow-link" href={workflow.name === "社群內容" ? "/social" : "#workflows"}>了解工作流 <span>→</span></a>
                </article>
              ))}
            </div>
          </section>

          <footer className="page-footer"><span>你的個人工作台</span><span>通知由 Make 傳入，核准仍在 Notion 完成。</span></footer>
        </div>
      </section>
    </main>
  );
}
