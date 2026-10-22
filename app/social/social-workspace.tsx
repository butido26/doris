"use client";

import { useEffect, useState, type FormEvent } from "react";

type Draft = {
  id: string;
  platform: string;
  content: string;
  image_url: string | null;
  scheduled_for: string | null;
  status: string;
  created_at: string;
};

type SpeechRecognitionResult = { 0: { transcript: string }; };
type SpeechRecognitionEvent = { results: ArrayLike<SpeechRecognitionResult>; };
type SpeechRecognitionLike = {
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike; };

export default function SocialWorkspace({ initialDrafts, aiConfigured, storageConfigured, makeConfigured }: { initialDrafts: Draft[]; aiConfigured: boolean; storageConfigured: boolean; makeConfigured: boolean }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [instruction, setInstruction] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [makeTestBusy, setMakeTestBusy] = useState(false);

  useEffect(() => {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "zh-TW";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setInstruction((current) => current ? `${current} ${transcript}` : transcript);
    };
    recognition.onerror = () => { setListening(false); setError("語音辨識沒有成功，請再試一次或直接輸入指令。"); };
    recognition.onend = () => setListening(false);
    if (!listening) return;
    setError("");
    try { recognition.start(); } catch { setListening(false); }
    return () => recognition.stop();
  }, [listening]);

  async function generateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!instruction.trim()) { setError("請先輸入或說出這篇貼文的主題與需求。"); return; }
    if (!aiConfigured) { setError("AI 文案服務尚未設定。你可以先在下方手動撰寫並保存草稿；AI 服務設定好後再用指令生成。"); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/assistant/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction: instruction.trim(), platform: "Threads" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "文案生成失敗，請稍後再試。");
      setContent(data.content ?? "");
      setMessage("草稿已產生，請檢查並修改商品資訊，再保存。尚未發布。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "文案生成失敗，請稍後再試。");
    } finally { setBusy(false); }
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (!content.trim()) { setError("請先輸入文案。"); return; }
    if (!storageConfigured) { setError("草稿資料表尚未在 Supabase 建立，現在還不能保存。請先完成網站提供的資料庫設定步驟。"); return; }
    if (imageUrl && !/^https:\/\//i.test(imageUrl.trim())) { setError("圖片網址需以 https:// 開頭。"); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/social-drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: "Threads", content: content.trim(), image_url: imageUrl.trim() || null, scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "保存失敗。");
      setDrafts((current) => [data.draft, ...current]);
      setMessage("草稿已保存到你的工作台。尚未送交核准、尚未排程，也不會自動發布。");
      setContent(""); setInstruction(""); setImageUrl(""); setScheduledFor("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失敗。請確認資料表已建立後再試。");
    } finally { setBusy(false); }
  }

  async function testMakeConnection() {
    setError(""); setMessage(""); setMakeTestBusy(true);
    try {
      const response = await fetch("/api/social-drafts/make-schema-test", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Make 連線測試失敗。");
      setMessage("Make 已收到一筆虛構欄位測試資料；這不是你的草稿，也沒有發布貼文。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Make 連線測試失敗。");
    } finally { setMakeTestBusy(false); }
  }

  return <div className="social-grid">
    <section className="social-card assistant-panel">
      <div className="social-card-heading"><div><span className="section-kicker">AI WORK ASSISTANT</span><h2>告訴小秘書你要做什麼</h2></div><span className="draft-badge">Threads</span></div>
      <p className="social-hint">例如：「幫我寫一篇新品上市面膜的 Threads 貼文，語氣親切，附上這個圖片網址。」</p>
      {makeConfigured && <div className="assistant-form-actions"><button type="button" className="secondary-button" onClick={testMakeConnection} disabled={makeTestBusy}>{makeTestBusy ? "測試中…" : "測試 Make 連線（只送虛構資料）"}</button></div>}
      <form onSubmit={generateDraft} className="assistant-form">
        <label htmlFor="assistant-instruction">指令</label>
        <textarea id="assistant-instruction" rows={4} value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="輸入需求，或按麥克風口述……" maxLength={3000} />
        <div className="assistant-form-actions"><button type="button" className="secondary-button" onClick={() => setListening((value) => !value)}>{listening ? "停止聆聽" : "🎙 語音輸入"}</button><button className="primary-button" disabled={busy || !aiConfigured}>{busy ? "處理中…" : "產生草稿"}</button></div>
      </form>
      {!aiConfigured && <p className="setup-note">AI 金鑰尚未加入網站伺服器設定。設定完成後，這裡就能生成文案；手動編輯和保存草稿不依賴 AI。</p>}
    </section>

    <section className="social-card editor-panel">
      <div className="social-card-heading"><div><span className="section-kicker">MANUAL OR AI DRAFT</span><h2>貼文草稿</h2></div><span className="status-draft">未發布</span></div>
      <form onSubmit={saveDraft} className="draft-form">
        <label htmlFor="draft-content">Threads 文案</label>
        <textarea id="draft-content" rows={7} value={content} onChange={(event) => setContent(event.target.value)} placeholder="你可以直接在這裡手動輸入，或先用小秘書產生再修改。" maxLength={5000} />
        <label htmlFor="draft-image">圖片網址（選填）</label>
        <input id="draft-image" type="url" inputMode="url" placeholder="https://……" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
        <label htmlFor="draft-schedule">希望發布時間（選填）</label>
        <input id="draft-schedule" type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
        <p className="schedule-note">填寫時間只會記在草稿中；Make 排程尚未串接，不會因此自動發文。</p>
        {!storageConfigured && <p className="setup-note">Supabase 草稿資料表還沒建立。完成資料庫升級後即可保存到帳號。</p>}
        <button className="primary-button save-draft-button" disabled={busy || !storageConfigured}>{busy ? "保存中…" : "保存草稿"}</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>

    <section className="social-card drafts-panel">
      <div className="social-card-heading"><div><span className="section-kicker">SAVED TO YOUR ACCOUNT</span><h2>最近草稿 <span className="count">{drafts.length}</span></h2></div></div>
      {drafts.length ? <div className="saved-drafts">{drafts.map((draft) => <article className="saved-draft" key={draft.id}><div className="saved-draft-top"><span>Threads · {draft.status === "draft" ? "草稿" : draft.status}</span><small>{new Date(draft.created_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</small></div><p>{draft.content}</p>{draft.image_url && <a href={draft.image_url} target="_blank" rel="noreferrer">查看圖片網址 ↗</a>}{draft.scheduled_for && <small className="saved-schedule">希望發布：{new Date(draft.scheduled_for).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</small>}</article>)}</div> : <p className="empty-drafts">還沒有保存的草稿。你可以先手動輸入一篇測試。</p>}
    </section>
  </div>;
}
