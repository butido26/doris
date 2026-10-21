import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = { searchParams: Promise<{ error?: string; setup?: string }> };

export async function signInAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) redirect("/login?setup=1");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=1");
  redirect("/");
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f6f8f8", fontFamily: "Arial, sans-serif", color: "#202a35" }}>
      <section style={{ width: "min(100%, 420px)", padding: 32, background: "white", border: "1px solid #e9edf0", borderRadius: 16, boxShadow: "0 10px 32px #24364110" }}>
        <div style={{ color: "#287f72", fontWeight: 700, marginBottom: 32 }}>Doris 的工作台</div>
        <p style={{ color: "#89969c", fontSize: 11, letterSpacing: 1 }}>PRIVATE WORKSPACE</p>
        <h1 style={{ marginBottom: 8 }}>歡迎回來</h1>
        <p style={{ color: "#7e8a91", marginBottom: 24 }}>請登入以查看你的個人工作台。</p>
        {!configured || params.setup ? <p role="status" style={{ padding: 12, background: "#f0f5f3", borderRadius: 8, fontSize: 13 }}>登入程式已準備好，還需要在 Vercel 設定 Supabase Project URL 與 Publishable key。</p> : null}
        {params.error ? <p role="alert" style={{ padding: 12, background: "#fff0ee", borderRadius: 8, fontSize: 13 }}>登入資料不正確，請再確認電子郵件和密碼。</p> : null}
        <form action={signInAction} style={{ display: "grid", gap: 10, marginTop: 20 }}>
          <label htmlFor="email">電子郵件</label>
          <input id="email" name="email" type="email" autoComplete="email" required style={{ padding: 12, border: "1px solid #dfe6e3", borderRadius: 8 }} />
          <label htmlFor="password">密碼</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required style={{ padding: 12, border: "1px solid #dfe6e3", borderRadius: 8 }} />
          <button type="submit" disabled={!configured} style={{ marginTop: 8, padding: 13, border: 0, borderRadius: 8, background: configured ? "#287f72" : "#a5b9b3", color: "white", fontWeight: 700, cursor: configured ? "pointer" : "not-allowed" }}>登入工作台　→</button>
        </form>
        <p style={{ color: "#929da2", fontSize: 12, marginTop: 18 }}>不提供公開註冊；請使用你在 Supabase 建立的帳號。</p>
      </section>
    </main>
  );
}
