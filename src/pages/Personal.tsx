import { localDateTime } from "../lib/dates";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Trash2,
  Sun,
  Moon,
  User,
  ShieldCheck,
} from "lucide-react";
import { useApp, useRecords } from "../app/context";
import { Button, Card, PageTitle, Modal, Empty, Badge } from "../components/ui";
import { useAction, DataGuard } from "../hooks/data";
import { LanguagePicker } from "../components/layout/Layout";
import { AppError } from "../domain/models";
import type { RecordData } from "../domain/models";
export function Calendar() {
  const { t, i18n } = useTranslation();
  const { profile, repo } = useApp();
  const events = useRecords("calendar_events"),
    assignments = useRecords("assignments");
  const [date, setDate] = useState(new Date()),
    [view, setView] = useState("month"),
    [editor, setEditor] = useState<RecordData | null>(null),
    [deleting, setDeleting] = useState<RecordData | null>(null);
  const { run, busy } = useAction();
  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    view === "month" ? 1 : date.getDate(),
  );
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days = Array.from({ length: view === "month" ? 42 : 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const all: RecordData[] = [
    ...(events.data || []).map((e) => ({
      ...e,
      date: e.start_at,
      editable: true,
    })),
    ...(assignments.data || []).map((a) => ({
      ...a,
      date: a.deadline,
      editable: false,
    })),
  ];
  const shift = (n: number) => {
    const d = new Date(date);
    view === "month"
      ? d.setMonth(d.getMonth() + n)
      : d.setDate(d.getDate() + n * 7);
    setDate(d);
  };
  return (
    <>
      <PageTitle title={t("calendar")} subtitle={t("featureProgress")}>
        <Button onClick={() => setEditor({ id: "" })}>
          <Plus size={17} />
          {t("addEvent")}
        </Button>
      </PageTitle>
      <div className="toolbar">
        <div className="row-actions">
          <Button
            variant="secondary"
            aria-label={t("previous")}
            onClick={() => shift(-1)}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button variant="secondary" onClick={() => setDate(new Date())}>
            {t("today")}
          </Button>
          <Button
            variant="secondary"
            aria-label={t("next")}
            onClick={() => shift(1)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
        <h2>
          {date.toLocaleDateString(i18n.language, {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <select
          aria-label={t("calendar")}
          value={view}
          onChange={(e) => setView(e.target.value)}
        >
          <option value="month">{t("month")}</option>
          <option value="week">{t("week")}</option>
        </select>
      </div>
      <DataGuard queries={[events, assignments]}>
        <Card className="calendar-card">
          <div className="calendar-scroll">
            <div className="calendar-grid">
              {days.slice(0, 7).map((d) => (
                <div className="weekday" key={d.toISOString()}>
                  {d.toLocaleDateString(i18n.language, { weekday: "short" })}
                </div>
              ))}
              {days.map((d) => (
                <div
                  className={`calendar-cell ${d.getMonth() !== date.getMonth() ? "outside" : ""} ${d.toDateString() === new Date().toDateString() ? "is-today" : ""}`}
                  key={d.toISOString()}
                >
                  <span>{d.getDate()}</span>
                  {all
                    .filter(
                      (e) =>
                        new Date(e.date).toDateString() === d.toDateString(),
                    )
                    .map((e) => (
                      <button
                        className={
                          "calendar-event " +
                          (!e.editable ? "deadline-event" : "")
                        }
                        key={e.id}
                        onClick={() =>
                          e.editable
                            ? setEditor(e)
                            : window.location.assign("/app/assignment/" + e.id)
                        }
                      >
                        {e.title}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <h2>{t("upcoming")}</h2>
          {all
            .filter((e) => new Date(e.date) >= new Date())
            .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
            .slice(0, 8)
            .map((e) => (
              <div className="list-item" key={e.id}>
                <CalendarDays size={19} />
                <div>
                  <strong>{e.title}</strong>
                  <p>{new Date(e.date).toLocaleString(i18n.language)}</p>
                </div>
                {e.editable && (
                  <Button
                    variant="ghost"
                    aria-label={t("delete")}
                    onClick={() => setDeleting(e)}
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            ))}
        </Card>
      </DataGuard>
      <Modal
        title={t("addEvent")}
        open={!!editor}
        onClose={() => setEditor(null)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            run(async () => {
              if (
                !f.title ||
                Date.parse(String(f.end_at)) < Date.parse(String(f.start_at))
              )
                throw new AppError("invalidDate");
              await repo.save("calendar_events", {
                ...f,
                user_id: profile!.id,
                start_at: new Date(String(f.start_at)).toISOString(),
                end_at: new Date(String(f.end_at)).toISOString(),
                ...(editor?.id ? { id: editor.id } : {}),
              });
            }).then((ok) => ok && setEditor(null));
          }}
        >
          <label>
            {t("title")}
            <input
              name="title"
              required
              maxLength={180}
              defaultValue={editor?.title}
            />
          </label>
          <label>
            {t("description")}
            <textarea name="description" defaultValue={editor?.description} />
          </label>
          {["start_at", "end_at"].map((k, i) => (
            <label key={k}>
              {t(i ? "end" : "start")}
              <input
                type="datetime-local"
                name={k}
                required
                defaultValue={localDateTime(editor?.[k])}
              />
            </label>
          ))}
          <Button disabled={busy}>{t("save")}</Button>
        </form>
      </Modal>
      <Modal
        title={t("delete")}
        open={!!deleting}
        onClose={() => setDeleting(null)}
      >
        <p>{t("confirmDelete")}</p>
        <Button
          variant="danger"
          disabled={busy}
          onClick={() =>
            run(() => repo.remove("calendar_events", deleting!.id)).then(
              (ok) => ok && setDeleting(null),
            )
          }
        >
          {t("delete")}
        </Button>
      </Modal>
    </>
  );
}
export function Profile({ settings = false }: { settings?: boolean }) {
  const { t } = useTranslation();
  const { profile, repo, theme, toggleTheme } = useApp();
  const { run, busy } = useAction();
  return (
    <>
      <PageTitle title={t(settings ? "settings" : "profile")} />
      <div className="detail-grid">
        <Card>
          <span className="profile-avatar">
            {profile?.full_name?.slice(0, 1) || <User />}
          </span>
          <h2>{profile?.full_name}</h2>
          <Badge>
            {t(
              profile?.role === "admin"
                ? "administrator"
                : profile?.role || "student",
            )}
          </Badge>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              run(() => repo.save("profiles", { id: profile!.id, ...f }));
            }}
          >
            <label>
              {t("name")}
              <input
                name="full_name"
                minLength={2}
                maxLength={120}
                required
                defaultValue={profile?.full_name}
              />
            </label>
            <label>
              {t("bio")}
              <textarea
                name="bio"
                maxLength={2000}
                defaultValue={profile?.bio}
                rows={4}
              />
            </label>
            <Button disabled={busy}>{t("save")}</Button>
          </form>
        </Card>
        <div>
          <Card>
            <h2>{t("language")}</h2>
            <LanguagePicker />
          </Card>
          <Card>
            <h2>{t("theme")}</h2>
            <Button variant="secondary" onClick={toggleTheme}>
              {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}{" "}
              {t(theme)}
            </Button>
          </Card>
          <Card>
            <ShieldCheck size={24} />
            <p>{t("privacy")}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
export function Notifications() {
  const { t, i18n } = useTranslation();
  const notifications = useRecords("notifications");
  const { repo } = useApp();
  const { run, busy } = useAction();
  return (
    <>
      <PageTitle title={t("notifications")} />
      <DataGuard queries={[notifications]}>
        <Card>
          {notifications.data?.length ? (
            notifications.data.map((n) => (
              <div className="list-item" key={n.id}>
                <div>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                  <small>
                    {new Date(n.created_at).toLocaleString(i18n.language)}
                  </small>
                </div>
                <Button
                  variant="secondary"
                  disabled={busy || n.read}
                  onClick={() =>
                    run(() =>
                      repo.save("notifications", { id: n.id, read: true }),
                    )
                  }
                >
                  {t(n.read ? "completed" : "read")}
                </Button>
              </div>
            ))
          ) : (
            <Empty />
          )}
        </Card>
      </DataGuard>
    </>
  );
}
