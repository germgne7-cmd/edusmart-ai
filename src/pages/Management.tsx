import { localDateTime } from "../lib/dates";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { useApp, useRecords } from "../app/context";
import { Button, Card, Empty, Modal, PageTitle, Badge } from "../components/ui";
import { DataGuard, useAction } from "../hooks/data";
import { LearningService } from "../services/learning";
import type { RecordData } from "../domain/models";
import { AppError } from "../domain/models";
import { supabase } from "../lib/supabase";
import { validateFile } from "../domain/rules";
export function Management({
  kind,
}: {
  kind: "courses" | "lessons" | "assignments";
}) {
  const { t } = useTranslation();
  const { repo, profile, demo } = useApp();
  const records = useRecords(kind),
    courses = useRecords("courses");
  const { run, busy } = useAction();
  const [editor, setEditor] = useState<RecordData | null>(null),
    [deleting, setDeleting] = useState<RecordData | null>(null),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [file, setFile] = useState<File | null>(null);
  const mine = (courses.data || []).filter(
    (c) => profile?.role === "admin" || c.teacher_id === profile?.id,
  );
  const rows = (records.data || []).filter(
    (r) =>
      (kind === "courses"
        ? profile?.role === "admin" || r.teacher_id === profile?.id
        : mine.some((c) => c.id === r.course_id)) &&
      r.title.toLowerCase().includes(search.toLowerCase()) &&
      (!filter || r.course_id === filter),
  );
  function field(name: string, type = "text", required = true) {
    return (
      <label key={name}>
        {t(
          name === "course_id"
            ? "course"
            : name === "cover_url"
              ? "cover"
              : name,
        )}
        {type === "textarea" ? (
          <textarea
            required={required}
            name={name}
            defaultValue={editor?.[name] || ""}
            rows={5}
          />
        ) : (
          <input
            required={required}
            name={name}
            type={type}
            defaultValue={
              type === "datetime-local"
                ? localDateTime(editor?.[name])
                : (editor?.[name] ?? "")
            }
            min={type === "number" ? 0 : undefined}
          />
        )}
      </label>
    );
  }
  return (
    <>
      <PageTitle title={t(kind === "courses" ? "manageCourses" : kind)}>
        <Button
          onClick={() => {
            setEditor({ id: "" });
            setFile(null);
          }}
        >
          <Plus size={17} />
          {t("create")}
        </Button>
      </PageTitle>
      <div className="toolbar">
        <input
          aria-label={t("search")}
          placeholder={t("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {kind !== "courses" && (
          <select
            aria-label={t("course")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">{t("all")}</option>
            {mine.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </div>
      <DataGuard queries={[records, courses]}>
        <Card>
          {rows.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("title")}</th>
                    <th>{t(kind === "courses" ? "status" : "course")}</th>
                    <th>{t("edit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.title}</td>
                      <td>
                        {kind === "courses"
                          ? t(r.status)
                          : mine.find((c) => c.id === r.course_id)?.title}
                      </td>
                      <td>
                        <div className="row-actions">
                          <Button
                            variant="ghost"
                            aria-label={t("edit")}
                            onClick={() => {
                              setEditor(r);
                              setFile(null);
                            }}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            aria-label={t("delete")}
                            onClick={() => setDeleting(r)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </Card>
      </DataGuard>
      <Modal
        title={t(editor?.id ? "edit" : "create") + " · " + t(kind)}
        open={!!editor}
        onClose={() => setEditor(null)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            run(async () => {
              if (demo) throw new AppError("noDemoWrite");
              if (kind === "courses") {
                await new LearningService(repo).saveCourse(
                  data,
                  profile!.id,
                  editor?.id || undefined,
                );
              } else {
                let material_path = editor?.material_path;
                if (kind === "lessons" && file) {
                  validateFile(file);
                  material_path = `${data.course_id}/${crypto.randomUUID()}.${file.name.split(".").pop()}`;
                  const { error } = await supabase!.storage
                    .from("materials")
                    .upload(material_path, file);
                  if (error) throw error;
                }
                if (
                  kind === "assignments" &&
                  Date.parse(String(data.deadline)) <= Date.now()
                )
                  throw new AppError("invalidDate");
                await repo.save(kind, {
                  ...data,
                  ...(editor?.id ? { id: editor.id } : {}),
                  ...(kind === "lessons"
                    ? {
                        position: Number(data.position),
                        material_path: material_path || null,
                      }
                    : {
                        deadline: new Date(String(data.deadline)).toISOString(),
                      }),
                });
              }
            }).then((ok) => ok && setEditor(null));
          }}
        >
          {kind !== "courses" && (
            <label>
              {t("course")}
              <select
                name="course_id"
                required
                defaultValue={editor?.course_id || ""}
              >
                <option value="">{t("selectCourse")}</option>
                {mine.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {field("title")}
          {field(kind === "lessons" ? "content" : "description", "textarea")}
          {kind === "courses" ? (
            <>
              <label>
                {t("category")}
                <input
                  name="category"
                  required
                  defaultValue={editor?.category || ""}
                />
              </label>
              <div className="form-grid">
                <label>
                  {t("difficulty")}
                  <select
                    name="difficulty"
                    defaultValue={editor?.difficulty || "medium"}
                  >
                    {["easy", "medium", "hard"].map((k) => (
                      <option key={k} value={k}>
                        {t(k)}
                      </option>
                    ))}
                  </select>
                </label>
                {field("duration", "number")}
                <label>
                  {t("status")}
                  <select
                    name="status"
                    defaultValue={editor?.status || "draft"}
                  >
                    {["draft", "published"].map((k) => (
                      <option key={k} value={k}>
                        {t(k)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {field("cover_url", "url", false)}
            </>
          ) : kind === "assignments" ? (
            field("deadline", "datetime-local")
          ) : (
            <>
              <label>
                {t("sort")}
                <input
                  name="position"
                  type="number"
                  min="0"
                  defaultValue={editor?.position || 0}
                />
              </label>
              <label>
                {t("file")}
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </>
          )}
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
            run(() => repo.remove(kind, deleting!.id)).then(
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
export function Submissions() {
  const { t } = useTranslation();
  const subs = useRecords("submissions"),
    assignments = useRecords("assignments"),
    profiles = useRecords("profiles");
  const { repo } = useApp();
  const { run, busy } = useAction();
  const [selected, setSelected] = useState<RecordData | null>(null);
  return (
    <>
      <PageTitle title={t("submissions")} />
      <DataGuard queries={[subs, assignments, profiles]}>
        <Card>
          {subs.data?.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("name")}</th>
                    <th>{t("assignments")}</th>
                    <th>{t("score")}</th>
                    <th>{t("edit")}</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.data.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {profiles.data?.find((p) => p.id === s.user_id)
                          ?.full_name || s.user_id}
                      </td>
                      <td>
                        {
                          assignments.data?.find(
                            (a) => a.id === s.assignment_id,
                          )?.title
                        }
                      </td>
                      <td>{s.grade ?? "—"}</td>
                      <td>
                        <Button
                          variant="secondary"
                          onClick={() => setSelected(s)}
                        >
                          {t("submissions")}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty />
          )}
        </Card>
      </DataGuard>
      <Modal
        title={t("submissions")}
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <p className="submitted-answer">{selected.answer}</p>
            {selected.attachment_path && (
              <Button
                variant="secondary"
                onClick={() =>
                  run(async () => {
                    const { data, error } = await supabase!.storage
                      .from("documents")
                      .createSignedUrl(selected.attachment_path, 60);
                    if (error) throw error;
                    window.open(
                      data.signedUrl,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  })
                }
              >
                {t("download")}
              </Button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                run(() =>
                  new LearningService(repo).grade(
                    selected.id,
                    Number(f.get("grade")),
                    String(f.get("feedback")),
                  ),
                ).then((ok) => ok && setSelected(null));
              }}
            >
              <label>
                {t("grade")}
                <input
                  type="number"
                  name="grade"
                  required
                  min="0"
                  max="100"
                  defaultValue={selected.grade ?? ""}
                />
              </label>
              <label>
                {t("feedback")}
                <textarea name="feedback" defaultValue={selected.feedback} />
              </label>
              <Button disabled={busy}>{t("save")}</Button>
            </form>
          </>
        )}
      </Modal>
    </>
  );
}
export function Admin() {
  const { t } = useTranslation();
  const profiles = useRecords("profiles"),
    courses = useRecords("courses"),
    events = useRecords("activity");
  const { repo } = useApp();
  const { run, busy } = useAction();
  const [search, setSearch] = useState("");
  return (
    <>
      <PageTitle title={t("admin")} />
      <DataGuard queries={[profiles, courses, events]}>
        <div className="stats-grid">
          {(
            [
              [Users, "users", profiles.data?.length],
              [BookOpen, "courses", courses.data?.length],
              [CheckCircle2, "activity", events.data?.length],
            ] as const
          ).map(([Icon, k, v]) => (
            <Card key={k as string}>
              <Icon size={25} />
              <p>{t(k as string)}</p>
              <strong className="big-number">{v as number}</strong>
            </Card>
          ))}
        </div>
        <div className="toolbar">
          <input
            aria-label={t("search")}
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Card>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("name")}</th>
                  <th>{t("role")}</th>
                </tr>
              </thead>
              <tbody>
                {profiles.data
                  ?.filter((p) =>
                    p.full_name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((p) => (
                    <tr key={p.id}>
                      <td>{p.full_name}</td>
                      <td>
                        <select
                          aria-label={t("role") + " " + p.full_name}
                          disabled={busy}
                          value={p.role}
                          onChange={(e) =>
                            run(() =>
                              repo.save("profiles", {
                                id: p.id,
                                role: e.target.value,
                              }),
                            )
                          }
                        >
                          {["student", "teacher", "admin"].map((r) => (
                            <option value={r} key={r}>
                              {t(r === "admin" ? "administrator" : r)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Management kind="courses" />
      </DataGuard>
    </>
  );
}
