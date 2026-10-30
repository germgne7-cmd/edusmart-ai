import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Sparkles,
  ChartNoAxesCombined,
  Check,
  GraduationCap,
  Layers,
  Globe2,
  ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { Logo, LanguagePicker } from "../components/layout/Layout";
import { Button, Card } from "../components/ui";
import { useApp } from "../app/context";
import { supabase } from "../lib/supabase";
import { loginSchema, registrationSchema } from "../domain/rules";
import { z } from "zod";
export function Landing({ about = false }: { about?: boolean }) {
  const { t } = useTranslation();
  const { setDemo } = useApp();
  const navigate = useNavigate();
  return (
    <div className="public-page">
      <header className="public-nav">
        <Logo />
        <nav>
          <Link to="/about">{t("about")}</Link>
          <LanguagePicker />
          <Link to="/login">{t("login")}</Link>
          <Link className="button primary" to="/register">
            {t("getStarted")}
            <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <main>
        <section className="hero">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="hero-chip">
              <span /> {t("workspace")} · {t("brand")}
            </span>
            <h1>
              {about ? t("about") : t("hero")}
              <em>{t("heroAccent")}</em>
            </h1>
            <p>{t("heroBody")}</p>
            <div className="hero-actions">
              <Link className="button primary" to="/register">
                {t("getStarted")}
                <ArrowRight size={18} />
              </Link>
              <Button
                variant="secondary"
                onClick={() => {
                  setDemo(true);
                  navigate("/app/dashboard");
                }}
              >
                {t("demo")}
                <ArrowUpRight size={18} />
              </Button>
            </div>
            <div className="trust">
              <span>
                <ShieldCheck size={16} />
                {t("privacy")}
              </span>
              <span>
                <Globe2 size={16} />
                Қазақша · Русский · English
              </span>
            </div>
          </motion.div>
          <motion.div
            className="hero-art"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="art-label">EDUSMART / {t("workspace")}</div>
            <div className="art-center">
              <GraduationCap size={88} strokeWidth={1.2} />
              <span>e</span>
            </div>
            <div className="floating-card float-ai">
              <span className="icon-tile violet">
                <Sparkles />
              </span>
              <div>
                <strong>{t("assistant")}</strong>
                <small>{t("heroAccent")}</small>
              </div>
              <span className="status-dot" />
            </div>
            <div className="floating-card float-course">
              <BookOpen size={20} />
              <span>{t("courses")}</span>
              <div className="mini-bars">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>
            <div className="art-caption">
              <span>01 —</span> {t("footer")}
            </div>
          </motion.div>
        </section>
        <section className="features-section">
          <div className="section-heading">
            <p className="eyebrow">EDUSMART AI</p>
            <h2>{t("features")}</h2>
          </div>
          <div className="feature-grid">
            {[
              [BookOpen, "courses", "featureCourses"],
              [Sparkles, "assistant", "featureAI"],
              [ChartNoAxesCombined, "analytics", "featureProgress"],
            ].map(([Icon, title, body]) => (
              <Card key={title as string}>
                <div className="feature-icon">
                  <Icon size={26} />
                </div>
                <h3>{t(title as string)}</h3>
                <p>{t(body as string)}</p>
                <Link to="/register">
                  {t("getStarted")} <ArrowUpRight size={16} />
                </Link>
              </Card>
            ))}
          </div>
        </section>
        <section className="how-section">
          <div>
            <p className="eyebrow">01 / 02 / 03</p>
            <h2>{t("how")}</h2>
          </div>
          {["step1", "step2", "step3"].map((s, i) => (
            <div key={s}>
              <span className="step-number">0{i + 1}</span>
              <h3>{t(s)}</h3>
              <Check size={20} />
            </div>
          ))}
        </section>
        <section className="teacher-cta">
          <Layers size={52} />
          <div>
            <h2>{t("forTeachers")}</h2>
            <p>{t("teacherBody")}</p>
          </div>
          <Link className="button primary" to="/register">
            {t("register")}
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <footer className="public-footer">
        <Logo />
        <p>{t("footer")}</p>
        <Link to="/about">{t("about")}</Link>
        <span>© {new Date().getFullYear()} EduSmart AI</span>
      </footer>
    </div>
  );
}
export function AuthPage({
  mode,
}: {
  mode: "login" | "register" | "recovery" | "reset";
}) {
  const { t } = useTranslation();
  const { toast, setDemo } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const schema =
    mode === "register"
      ? registrationSchema
      : mode === "recovery"
        ? z.object({ email: z.email("invalidEmail") })
        : mode === "reset"
          ? z.object({ password: z.string().min(8, "shortPassword") })
          : loginSchema;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<any>({ resolver: zodResolver(schema) });
  const submit = async (values: any) => {
    if (!supabase) {
      toast(t("configError"));
      return;
    }
    let result;
    if (mode === "register")
      result = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { full_name: values.full_name },
          emailRedirectTo: window.location.origin + "/app/dashboard",
        },
      });
    else if (mode === "recovery")
      result = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: window.location.origin + "/reset",
      });
    else if (mode === "reset")
      result = await supabase.auth.updateUser({ password: values.password });
    else result = await supabase.auth.signInWithPassword(values);
    if (result.error) {
      toast(t("authError"));
      return;
    }
    if (mode === "login" || mode === "reset") {
      setDemo(false);
      navigate(location.state?.from || "/app/dashboard");
    } else toast(t("checkEmail"));
  };
  return (
    <div className="auth-page">
      <aside className="auth-art">
        <Logo />
        <div>
          <span className="hero-chip">{t("workspace")}</span>
          <h1>{t("welcome")}</h1>
          <p>{t("heroBody")}</p>
          <div className="auth-orb">
            <GraduationCap size={110} />
          </div>
        </div>
        <p>{t("footer")}</p>
      </aside>
      <div className="auth-main">
        <div className="auth-top">
          <Link to="/">← {t("back")}</Link>
          <LanguagePicker />
        </div>
        <form className="auth-form" onSubmit={handleSubmit(submit)}>
          <span className="icon-tile">
            <GraduationCap size={27} />
          </span>
          <h1>{t(mode === "reset" ? "newPassword" : mode)}</h1>
          <p>{t("heroAccent")}</p>
          {mode === "register" && (
            <label>
              {t("name")}
              <input autoComplete="name" {...register("full_name")} />
              {errors.full_name && (
                <small className="field-error">
                  {t(String(errors.full_name.message))}
                </small>
              )}
            </label>
          )}
          {mode !== "reset" && (
            <label>
              {t("email")}
              <input type="email" autoComplete="email" {...register("email")} />
              {errors.email && (
                <small className="field-error">
                  {t(String(errors.email.message))}
                </small>
              )}
            </label>
          )}
          {mode !== "recovery" && (
            <label>
              {t("password")}
              <input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                {...register("password")}
              />
              {errors.password && (
                <small className="field-error">
                  {t(String(errors.password.message))}
                </small>
              )}
            </label>
          )}
          {mode === "login" && (
            <Link className="form-link" to="/recovery">
              {t("forgot")}
            </Link>
          )}
          <Button disabled={isSubmitting} type="submit">
            {t(isSubmitting ? "loading" : mode === "reset" ? "save" : mode)}
            <ArrowRight size={16} />
          </Button>
          <div className="auth-links">
            <Link to={mode === "login" ? "/register" : "/login"}>
              {t(mode === "login" ? "register" : "login")}
            </Link>
            <button
              type="button"
              onClick={() => {
                setDemo(true);
                navigate("/app/dashboard");
              }}
            >
              {t("demo")} →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
