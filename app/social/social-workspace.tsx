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

const PLATFORMS = ["Threads", "Facebook", "Instagram", "LINE"] as const;
type Platform = (typeof PLATFORMS)[number];

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

export default function SocialWorkspace({ initialDrafts, aiConfigured, storageConfigured, makeConfigured, makeSubmissionEnabled }: { initialDrafts: Draft[]; aiConfigured: boolean; storageConfigured: boolean; makeConfigured: boolean; makeSubmissionEnabled: boolean }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [platform, setPlatform] = useState<Platform>("Threads");
  const [instruction, setInstruction] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [makeTestBusy, setMakeTestBusy] = useState(false);
  const [approvalBusyId, setApprovalBusyId] = useState<string | null>(null);

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
      const response = await fetch("/api/assistant/draft", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instruction: instruction.trim(), platform }) });
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
      const response = await fetch("/api/social-drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform, content: content.trim(), image_url: imageUrl.trim() || null, scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null }) });
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

  async function submitDraftForApproval(draftId: string) {
    setError(""); setMessage(""); setApprovalBusyId(draftId);
    try {
      const response = await fetch("/api/social-drafts/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft_id: draftId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "送交審核失敗。");
      setDrafts((current) => current.map((draft) => draft.id === draftId ? { ...draft, status: "awaiting_approval" } : draft));
      setMessage("草稿已送到 Notion 待審核；核准前不會發布。Instagram 發文與排程仍需完成 Make 串接。");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "送交審核失敗。請先檢查 Notion，避免重複送出。");
    } finally { setApprovalBusyId(null); }
  }

  function statusLabel(status: string) {
    if (status === "draft") return "草稿";
    if (status === "awaiting_approval") return "送審中";
    if (status === "scheduled") return "已排程";
    if (status === "published") return "已發布";
    if (status === "failed") return "發佈失敗";
    return status;
  }

  return <div className="social-grid">
    <section className="social-card assistant-panel">
      <div className="social-card-heading"><div><span className="section-kicker">AI WORK ASSISTANT</span><h2>告訴小秘書你要做什麼</h2></div><span className="draft-badge">{platform}</span></div>
      <div className="platform-picker" role="group" aria-label="選擇社群平台">{PLATFORMS.map((item) => <button key={item} type="button" className={platform === item ? "platform-choice active" : "platform-choice"} aria-pressed={platform === item} onClick={() => setPlatform(item)}>{item}</button>)}</div>
      <p className="social-hint">選擇平台後，可以請小秘書起草或手動編輯；各平台的發布串接尚未全部設定。</p>
      {makeConfigured && (platform === "Threads" || platform === "Instagram") && <div className="assistant-form-actions"><button type="button" className="secondary-button" onClick={testMakeConnection} disabled={makeTestBusy}>{makeTestBusy ? "測試中…" : platform === "Instagram" ? "測試 Instagram 欄位連線（只送虛構資料）" : "測試 Threads Make 連線（只送虛構資料）"}</button></div>}
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
        <label htmlFor="draft-content">{platform} 文案</label>
        <textarea id="draft-content" rows={7} value={content} onChange={(event) => setContent(event.target.value)} placeholder="你可以直接在這裡手動輸入，或先用小秘書產生再修改。" maxLength={5000} />
        <label htmlFor="draft-image">圖片網址（選填）</label>
        <input id="draft-image" type="url" inputMode="url" placeholder="https://……" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
        <label htmlFor="draft-schedule">希望發布時間（選填）</label>
        <input id="draft-schedule" type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
        <p className="schedule-note">預定時間只會記在草稿中；這個平台的排程尚未串接，不會因此自動發文。</p>
        {!storageConfigured && <p className="setup-note">Supabase 草稿資料表還沒建立。完成資料庫升級後即可保存到帳號。</p>}
        <button className="primary-button save-draft-button" disabled={busy || !storageConfigured}>{busy ? "保存中…" : "保存草稿"}</button>
      </form>
      {message && <p className="form-message" role="status">{message}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>

    <section className="social-card drafts-panel">
      <div className="social-card-heading"><div><span className="section-kicker">SAVED TO YOUR ACCOUNT</span><h2>最近草稿 <span className="count">{drafts.length}</span></h2></div></div>
      {drafts.length ? <div className="saved-drafts">{drafts.map((draft) => <article className="saved-draft" key={draft.id}><div className="saved-draft-top"><span>{draft.platform} · {statusLabel(draft.status)}</span><small>{new Date(draft.created_at).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</small></div><p>{draft.content}</p>{draft.image_url && <a href={draft.image_url} target="_blank" rel="noreferrer">查看圖片網址 ↗</a>}{draft.scheduled_for && <small className="saved-schedule">希望發布：{new Date(draft.scheduled_for).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}</small>}{draft.status === "draft" && (draft.platform === "Threads" || draft.platform === "Instagram") && <button type="button" className="secondary-button" disabled={!makeSubmissionEnabled || approvalBusyId === draft.id} onClick={() => submitDraftForApproval(draft.id)}>{approvalBusyId === draft.id ? "送交中…" : makeSubmissionEnabled ? "送交 Notion 審核" : "送交審核（設定中）"}</button>}{draft.status === "draft" && draft.platform !== "Threads" && draft.platform !== "Instagram" && <small className="saved-schedule">此平台的送審與發布串接尚未設定，可先保存草稿。</small>}{draft.status === "draft" && draft.platform === "Instagram" && <small className="saved-schedule">送審只會建立 Notion 待審核資料；核准後的 IG 發布流程仍在設定。</small>}</article>)}</div> : <p className="empty-drafts">還沒有保存的草稿。你可以先手動輸入一篇測試。</p>}
    </section>
  </div>;
}

