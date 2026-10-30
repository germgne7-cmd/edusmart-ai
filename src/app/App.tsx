import { lazy, Suspense } from "react";
import { Loading } from "../components/ui";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppProvider } from "./context";
import { Layout, Protected } from "../components/layout/Layout";
const Landing = lazy(() =>
  import("../pages/Public").then((m) => ({ default: m.Landing })),
);
const AuthPage = lazy(() =>
  import("../pages/Public").then((m) => ({ default: m.AuthPage })),
);
const Dashboard = lazy(() =>
  import("../pages/Learning").then((m) => ({ default: m.Dashboard })),
);
const Courses = lazy(() =>
  import("../pages/Learning").then((m) => ({ default: m.Courses })),
);
const CourseDetails = lazy(() =>
  import("../pages/Learning").then((m) => ({ default: m.CourseDetails })),
);
const Lesson = lazy(() =>
  import("../pages/Learning").then((m) => ({ default: m.Lesson })),
);
const Assignments = lazy(() =>
  import("../pages/Learning").then((m) => ({ default: m.Assignments })),
);
const AssignmentDetail = lazy(() =>
  import("../pages/Learning").then((m) => ({ default: m.AssignmentDetail })),
);
const Analytics = lazy(() =>
  import("../pages/Learning").then((m) => ({ default: m.Analytics })),
);
const Management = lazy(() =>
  import("../pages/Management").then((m) => ({ default: m.Management })),
);
const Submissions = lazy(() =>
  import("../pages/Management").then((m) => ({ default: m.Submissions })),
);
const Admin = lazy(() =>
  import("../pages/Management").then((m) => ({ default: m.Admin })),
);
const Calendar = lazy(() =>
  import("../pages/Personal").then((m) => ({ default: m.Calendar })),
);
const Profile = lazy(() =>
  import("../pages/Personal").then((m) => ({ default: m.Profile })),
);
const Notifications = lazy(() =>
  import("../pages/Personal").then((m) => ({ default: m.Notifications })),
);
const Documents = lazy(() =>
  import("../pages/AI").then((m) => ({ default: m.Documents })),
);
const Assistant = lazy(() =>
  import("../pages/AI").then((m) => ({ default: m.Assistant })),
);
const Quizzes = lazy(() =>
  import("../pages/AI").then((m) => ({ default: m.Quizzes })),
);
const Quiz = lazy(() =>
  import("../pages/AI").then((m) => ({ default: m.Quiz })),
);
export function App() {
  const { t } = useTranslation();
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<Landing about />} />
            {(["login", "register", "recovery", "reset"] as const).map(
              (mode) => (
                <Route
                  key={mode}
                  path={"/" + mode}
                  element={<AuthPage mode={mode} />}
                />
              ),
            )}
            <Route element={<Protected />}>
              <Route path="/app" element={<Layout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="courses" element={<Courses />} />
                <Route path="catalog" element={<Courses catalog />} />
                <Route path="course/:id" element={<CourseDetails />} />
                <Route path="lesson/:id" element={<Lesson />} />
                <Route path="assignments" element={<Assignments />} />
                <Route path="assignment/:id" element={<AssignmentDetail />} />
                <Route path="grades" element={<Analytics gradesOnly />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="calendar" element={<Calendar />} />
                <Route path="documents" element={<Documents />} />
                <Route path="analyzer" element={<Documents analyzer />} />
                <Route path="analyzer/:id" element={<Documents analyzer />} />
                <Route path="assistant" element={<Assistant />} />
                <Route path="quizzes" element={<Quizzes />} />
                <Route path="quiz/:id" element={<Quiz />} />
                <Route path="profile" element={<Profile />} />
                <Route path="settings" element={<Profile settings />} />
                <Route path="notifications" element={<Notifications />} />
                <Route element={<Protected roles={["teacher", "admin"]} />}>
                  <Route path="teacher" element={<Dashboard teacher />} />
                  <Route
                    path="manageCourses"
                    element={<Management kind="courses" />}
                  />
                  <Route
                    path="lessons"
                    element={<Management kind="lessons" />}
                  />
                  <Route
                    path="manageAssignments"
                    element={<Management kind="assignments" />}
                  />
                  <Route path="submissions" element={<Submissions />} />
                  <Route path="students" element={<Analytics teacher />} />
                </Route>
                <Route
                  path="admin"
                  element={
                    <Protected roles={["admin"]}>
                      <Admin />
                    </Protected>
                  }
                />
                <Route
                  path="users"
                  element={
                    <Protected roles={["admin"]}>
                      <Admin />
                    </Protected>
                  }
                />
                <Route
                  path="statistics"
                  element={
                    <Protected roles={["admin"]}>
                      <Admin />
                    </Protected>
                  }
                />
              </Route>
            </Route>
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>404</h1>
                  <p>{t("notFound")}</p>
                  <Link className="button primary" to="/">
                    {t("back")}
                  </Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  );
}
