import { useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import {
  Sparkles,
  UploadCloud,
  FileText,
  Trash2,
  Download,
  ArrowUpRight,
  Send,
  Plus,
  Copy,
  MessageSquare,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { useApp, useRecords } from "../app/context";
import {
  Button,
  Card,
  PageTitle,
  Empty,
  Modal,
  Badge,
  Loading,
} from "../components/ui";
import { DocumentService } from "../services/documents";
import { aiRequest } from "../services/ai";
import { DataGuard, useAction } from "../hooks/data";
import { supabase } from "../lib/supabase";
import { AppError } from "../domain/models";
import type { RecordData, Question } from "../domain/models";
export function Documents({ analyzer = false }: { analyzer?: boolean }) {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { profile, repo, notifyError, demo } = useApp();
  const docs = useRecords("documents"),
    analyses = useRecords("document_analyses");
  const { run, busy } = useAction();
  const [progress, setProgress] = useState(0),
    [search, setSearch] = useState(""),
    [type, setType] = useState(""),
    [sort, setSort] = useState("newest"),
    [selected, setSelected] = useState<string | null>(id || null),
    [deleting, setDeleting] = useState<RecordData | null>(null),
    [drag, setDrag] = useState(false);
  const uploadLock = useRef(false);
  const current = docs.data?.find((d) => d.id === selected);
  const analysis = analyses.data?.find(
    (a) => a.document_id === selected && a.language === i18n.language,
  );
  const upload = async (file?: File) => {
    if (!file || uploadLock.current) return;
    uploadLock.current = true;
    await run(async () => {
      if (demo) throw new AppError("noDemoWrite");
      const d = await new DocumentService(repo).upload(
        file,
        profile!.id,
        setProgress,
      );
      setSelected(d.id);
    });
    uploadLock.current = false;
    setProgress(0);
  };
  const list = (docs.data || [])
    .filter(
      (d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) &&
        (!type || d.name.toLowerCase().endsWith("." + type)),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.name.localeCompare(b.name)
        : Date.parse(b.created_at) - Date.parse(a.created_at),
    );
  return (
    <>
      <PageTitle
        title={t(analyzer ? "analyzer" : "documents")}
        subtitle={t("privacy")}
      >
        <Badge>
          <ShieldCheck size={13} />
          {t("workspace")}
        </Badge>
      </PageTitle>
      <div
        className={`upload-zone ${drag ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files[0]);
        }}
      >
        <UploadCloud size={32} />
        <h3>{t("uploadHint")}</h3>
        <p>{t("fileHint")}</p>
        <label className="button primary upload-button">
          {t(busy ? "loading" : "upload")}
          <input
            aria-label={t("upload")}
            type="file"
            accept=".pdf,.docx,.txt"
            disabled={busy}
            onChange={(e) => {
              upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {progress > 0 && (
          <progress aria-label={t("upload")} max="100" value={progress} />
        )}
      </div>
      <div className="toolbar">
        <input
          aria-label={t("search")}
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label={t("file")}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">{t("all")}</option>
          {["pdf", "docx", "txt"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label={t("sort")}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">{t("newest")}</option>
          <option value="title">{t("title")}</option>
        </select>
      </div>
      <DataGuard queries={[docs, analyses]}>
        <div className={current ? "detail-grid" : "documents-list"}>
          <Card>
            {list.length ? (
              list.map((d) => (
                <div
                  className={
                    "list-item document-item " +
                    (selected === d.id ? "selected" : "")
                  }
                  key={d.id}
                >
                  <button
                    className="document-open"
                    onClick={() => setSelected(d.id)}
                  >
                    <span className="icon-tile">
                      <FileText size={21} />
                    </span>
                    <div>
                      <h3>{d.name}</h3>
                      <p>
                        {Math.ceil(d.size / 1024)} KB ·{" "}
                        {new Date(d.created_at).toLocaleDateString(
                          i18n.language,
                        )}
                      </p>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    aria-label={t("download")}
                    disabled={busy}
                    onClick={() =>
                      run(() => new DocumentService(repo).download(d.path))
                    }
                  >
                    <Download size={17} />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={t("delete")}
                    onClick={() => setDeleting(d)}
                  >
                    <Trash2 size={17} />
                  </Button>
                </div>
              ))
            ) : (
              <Empty />
            )}
          </Card>
          {current && (
            <Card>
              <div className="section-title">
                <h2>{current.name}</h2>
                <button
                  className="icon-button"
                  onClick={() => setSelected(null)}
                  aria-label={t("cancel")}
                >
                  ×
                </button>
              </div>
              <p className="muted">{current.detected_title}</p>
              <div className="metadata">
                <span>
                  {t("words")}: {current.word_count}
                </span>
                <span>
                  {t("characters")}: {current.character_count}
                </span>
                {current.page_count && (
                  <span>
                    {t("pages")}: {current.page_count}
                  </span>
                )}
              </div>
              <div className="row-actions">
                <Button
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      aiRequest("analyze", {
                        documentId: current.id,
                        language: i18n.language,
                      }),
                    )
                  }
                >
                  <Sparkles size={16} />
                  {t("analyze")}
                </Button>
                <Link
                  className="button secondary"
                  to={"/app/assistant?document=" + current.id}
                >
                  {t("askDocument")}
                  <ArrowUpRight size={16} />
                </Link>
              </div>
              {analysis ? (
                <div className="analysis-result">
                  {[
                    "summary",
                    "notes",
                    "ideas",
                    "terms",
                    "concepts",
                    "questions",
                    "outline",
                  ].map((k) => (
                    <section key={k}>
                      <h3>{t(k)}</h3>
                      {Array.isArray(analysis.result[k]) ? (
                        <ul>
                          {analysis.result[k].map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      ) : (
                        <ReactMarkdown>{analysis.result[k]}</ReactMarkdown>
                      )}
                    </section>
                  ))}
                </div>
              ) : (
                <p className="extracted-text">{current.text.slice(0, 1800)}</p>
              )}
            </Card>
          )}
        </div>
      </DataGuard>
      <Modal
        title={t("delete")}
        open={!!deleting}
        onClose={() => setDeleting(null)}
      >
        <p>{t("confirmDelete")}</p>
        <Button
          disabled={busy}
          variant="danger"
          onClick={() =>
            run(() =>
              new DocumentService(repo).remove(deleting!.id, deleting!.path),
            ).then((ok) => {
              if (ok) {
                setDeleting(null);
                setSelected(null);
              }
            })
          }
        >
          {t("delete")}
        </Button>
      </Modal>
    </>
  );
}
export function Assistant() {
  const { t, i18n } = useTranslation();
  const { repo, notifyError, refresh, toast } = useApp();
  const chats = useRecords("ai_conversations"),
    messages = useRecords("ai_messages");
  const [selected, setSelected] = useState<string | null>(null),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false);
  const documentId =
    new URLSearchParams(window.location.search).get("document") || undefined;
  const current = chats.data?.find((c) => c.id === selected);
  const shown = (messages.data || [])
    .filter((m) => m.conversation_id === selected)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    setBusy(true);
    try {
      const result = await aiRequest("chat", {
        language: i18n.language,
        message: input,
        conversationId: selected || undefined,
        documentId: current?.document_id || documentId,
      });
      setSelected(result.conversationId);
      setInput("");
      refresh();
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageTitle title={t("assistant")} subtitle={t("featureAI")}>
        <Badge>
          <Sparkles size={13} /> AI
        </Badge>
      </PageTitle>
      <div className="chat-workspace">
        <aside className="chat-sidebar">
          <Button variant="secondary" onClick={() => setSelected(null)}>
            <Plus size={16} />
            {t("newChat")}
          </Button>
          {chats.data
            ?.filter((c) => !documentId || c.document_id === documentId)
            .map((c) => (
              <div className="chat-history-item" key={c.id}>
                <button
                  className={selected === c.id ? "active" : ""}
                  onClick={() => setSelected(c.id)}
                >
                  <MessageSquare size={16} />
                  {c.title}
                </button>
                <Button
                  variant="ghost"
                  aria-label={t("delete")}
                  onClick={async () => {
                    try {
                      await repo.remove("ai_conversations", c.id);
                      if (selected === c.id) setSelected(null);
                      refresh();
                    } catch (e) {
                      notifyError(e);
                    }
                  }}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
        </aside>
        <div className="chat-main">
          <div className="messages" aria-live="polite">
            {!shown.length && !busy && (
              <div className="chat-welcome">
                <span className="ai-orb">
                  <Sparkles size={32} />
                </span>
                <h2>{t("welcomeAI")}</h2>
                <p>{t(documentId ? "askDocument" : "heroAccent")}</p>
                <div className="chat-suggestions">
                  {["featureCourses", "featureAI", "featureProgress"].map(
                    (k) => (
                      <button key={k} onClick={() => setInput(t(k))}>
                        {t(k)}
                        <ArrowUpRight size={16} />
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}
            {shown.map((m) => (
              <article className={"message " + m.role} key={m.id}>
                <span className="message-avatar">
                  {m.role === "assistant" ? (
                    <Sparkles size={16} />
                  ) : (
                    <span>●</span>
                  )}
                </span>
                <div className="message-body">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                  <small>
                    {new Date(m.created_at).toLocaleTimeString(i18n.language, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <button
                      aria-label={t("copy")}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(m.content);
                          toast(t("copied"));
                        } catch {
                          toast(t("error"));
                        }
                      }}
                    >
                      <Copy size={13} />
                    </button>
                  </small>
                </div>
              </article>
            ))}
            {busy && <Loading />}
          </div>
          <form className="chat-input" onSubmit={send}>
            <textarea
              aria-label={t("ask")}
              placeholder={t("ask")}
              rows={2}
              maxLength={6000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <Button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label={t("send")}
            >
              <Send size={19} />
            </Button>
          </form>
          <small className="chat-privacy">{t("privacy")}</small>
        </div>
      </div>
    </>
  );
}
export function Quizzes() {
  const { t, i18n } = useTranslation();
  const quizzes = useRecords("quizzes"),
    docs = useRecords("documents"),
    courses = useRecords("courses");
  const { notifyError } = useApp();
  const { run, busy } = useAction();
  const navigate = useNavigate();
  const [source, setSource] = useState("document");
  return (
    <>
      <PageTitle title={t("quizzes")} subtitle={t("featureAI")} />
      <div className="detail-grid">
        <Card className="quiz-generator">
          <span className="icon-tile violet">
            <Sparkles size={25} />
          </span>
          <h2>{t("generate")}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              run(async () => {
                const r = await aiRequest("quiz", {
                  language: i18n.language,
                  ...(source === "document"
                    ? { documentId: f.get("source") }
                    : { courseId: f.get("source") }),
                  difficulty: f.get("difficulty"),
                  count: Number(f.get("count")),
                });
                navigate("/app/quiz/" + r.id);
              });
            }}
          >
            <div className="tabs">
              <button
                type="button"
                className={source === "document" ? "active" : ""}
                onClick={() => setSource("document")}
              >
                {t("documents")}
              </button>
              <button
                type="button"
                className={source === "course" ? "active" : ""}
                onClick={() => setSource("course")}
              >
                {t("courses")}
              </button>
            </div>
            <label>
              {t(source === "document" ? "selectDocument" : "selectCourse")}
              <select name="source" required>
                <option value="">—</option>
                {(source === "document" ? docs.data : courses.data)?.map(
                  (d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || d.title}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              {t("difficulty")}
              <select name="difficulty">
                {["easy", "medium", "hard"].map((d) => (
                  <option value={d} key={d}>
                    {t(d)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("questionCount")}
              <select name="count">
                {[5, 10, 15, 20].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <Button disabled={busy}>
              <Sparkles size={16} />
              {t(busy ? "loading" : "generate")}
            </Button>
          </form>
        </Card>
        <Card>
          <h2>{t("quizzes")}</h2>
          <DataGuard queries={[quizzes, docs, courses]}>
            {quizzes.data?.length ? (
              quizzes.data.map((q) => (
                <Link className="list-item" key={q.id} to={"/app/quiz/" + q.id}>
                  <span className="icon-tile">
                    <CheckCircle2 size={19} />
                  </span>
                  <div>
                    <h3>{q.title}</h3>
                    <p>
                      {t(q.difficulty)} ·{" "}
                      {new Date(q.created_at).toLocaleDateString(i18n.language)}
                    </p>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))
            ) : (
              <Empty />
            )}
          </DataGuard>
        </Card>
      </div>
    </>
  );
}
export function Quiz() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { notifyError, refresh } = useApp();
  const [questions, setQuestions] = useState<Question[] | null>(null),
    [answers, setAnswers] = useState<number[]>([]),
    [result, setResult] = useState<any>(null),
    [started, setStarted] = useState(0),
    [busy, setBusy] = useState(false);
  async function start() {
    setBusy(true);
    try {
      if (!supabase) throw new AppError("configError");
      const { data, error } = await supabase.rpc("get_quiz", { qid: id });
      if (error) throw error;
      setQuestions(data);
      setStarted(Date.now());
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (!supabase) throw new AppError("configError");
      if (
        !questions ||
        answers.filter((a) => Number.isInteger(a)).length !== questions.length
      )
        throw new AppError("required");
      const { data, error } = await supabase.rpc("submit_quiz", {
        qid: id,
        choices: answers,
        elapsed: Math.round((Date.now() - started) / 1000),
      });
      if (error) throw error;
      setResult(data);
      refresh();
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle title={t("quizzes")} />
      {!questions ? (
        <Card>
          <Button disabled={busy} onClick={start}>
            {t("getStarted")}
          </Button>
        </Card>
      ) : (
        <form onSubmit={submit}>
          {result && (
            <Card className="quiz-result">
              <span className="icon-tile">
                <CheckCircle2 />
              </span>
              <h2>{t("result")}</h2>
              <strong className="big-number">{result.score}%</strong>
              <p>
                {t("correct")}: {result.correct} / {result.total} ·{" "}
                {t("incorrect")}: {result.total - result.correct} · {t("time")}:{" "}
                {result.seconds}
              </p>
            </Card>
          )}
          {questions.map((q, i) => (
            <Card key={i}>
              <h3>
                {i + 1}. {q.question}
              </h3>
              <div className="quiz-options">
                {q.options.map((option, j) => (
                  <label
                    key={j}
                    className={`quiz-option ${result?.questions[i].correct_answer === j ? "correct" : ""}`}
                  >
                    <input
                      type="radio"
                      required
                      name={"q" + i}
                      value={j}
                      disabled={!!result}
                      checked={answers[i] === j}
                      onChange={() =>
                        setAnswers((a) => {
                          const n = [...a];
                          n[i] = j;
                          return n;
                        })
                      }
                    />
                    <span>{String.fromCharCode(65 + j)}</span>
                    {option}
                  </label>
                ))}
              </div>
              {result && <p>{result.questions[i].explanation}</p>}
            </Card>
          ))}
          {!result && <Button disabled={busy}>{t("submit")}</Button>}
        </form>
      )}
    </>
  );
}
