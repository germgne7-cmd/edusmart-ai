import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  repository,
  type Repository,
  type QueryOptions,
} from "../repositories/data";
import { DemoRepository } from "../repositories/demo";
import type { Profile } from "../domain/models";
import { safeMessage } from "../domain/rules";
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
});
interface State {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  demo: boolean;
  repo: Repository;
  setDemo: (b: boolean) => void;
  toast: (message: string) => void;
  notifyError: (e: unknown) => void;
  refresh: () => void;
  theme: string;
  toggleTheme: () => void;
}
const Context = createContext<State>(null!);
export function AppProvider({ children }: { children: ReactNode }) {
  const { i18n, t } = useTranslation();
  const [session, setSession] = useState<Session | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [loading, setLoading] = useState(!!supabase),
    [demo, setDemoState] = useState(
      sessionStorage.getItem("edusmart-demo") === "true",
    ),
    [notice, setNotice] = useState(""),
    [theme, setTheme] = useState(
      localStorage.getItem("edusmart-theme") || "light",
    );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("edusmart-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    setProfile(null);
    if (session) {
      setDemoState(false);
      sessionStorage.removeItem("edusmart-demo");
      repository
        .get("profiles", session.user.id)
        .then((p) => {
          setProfile(p as Profile);
          if (p.language) i18n.changeLanguage(p.language);
        })
        .catch(() => setNotice(t("error")));
    }
  }, [session?.user.id]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const repo = demo ? new DemoRepository(i18n.language) : repository;
  const current = demo
    ? ({
        id: "demo",
        full_name: i18n.language === "en" ? "Aidana" : "Айдана",
        role: "student",
        language: i18n.language,
        bio: "",
      } as Profile)
    : profile;
  const setDemo = (value: boolean) => {
    sessionStorage.setItem("edusmart-demo", String(value));
    setDemoState(value);
    queryClient.clear();
  };
  return (
    <QueryClientProvider client={queryClient}>
      <Context.Provider
        value={{
          session,
          profile: current,
          loading,
          demo,
          repo,
          setDemo,
          toast: setNotice,
          notifyError: (e) => setNotice(t(safeMessage(e))),
          refresh: () => {
            queryClient.invalidateQueries();
            if (session)
              repository
                .get("profiles", session.user.id)
                .then((p) => setProfile(p as Profile))
                .catch(() => setNotice(t("error")));
          },
          theme,
          toggleTheme: () =>
            setTheme((v) => (v === "light" ? "dark" : "light")),
        }}
      >
        {children}
        {notice && (
          <div role="status" className="toast" onClick={() => setNotice("")}>
            {notice}
          </div>
        )}
      </Context.Provider>
    </QueryClientProvider>
  );
}
export const useApp = () => useContext(Context);
export function useRecords(table: string, options: QueryOptions = {}) {
  const { repo, demo, session } = useApp();
  const { i18n } = useTranslation();
  return useQuery({
    queryKey: [table, demo, session?.user.id, i18n.language, options],
    queryFn: () => repo.list(table, options),
    enabled: demo || !!session,
  });
}
