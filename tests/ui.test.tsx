import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import i18n from "../src/i18n";
import en from "../src/i18n/locales/en.json";
import kk from "../src/i18n/locales/kk.json";
import ru from "../src/i18n/locales/ru.json";
import { AppProvider } from "../src/app/context";
import { AuthPage, Landing } from "../src/pages/Public";
import { Button, Modal, Empty } from "../src/components/ui";
import { LanguagePicker } from "../src/components/layout/Layout";
const wrap = (ui: React.ReactNode) =>
  render(
    <AppProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AppProvider>,
  );
beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  await i18n.changeLanguage("en");
});
afterEach(cleanup);
describe("interface", () => {
  it("renders landing CTA", () => {
    wrap(<Landing />);
    expect(screen.getAllByText("Start learning").length).toBeGreaterThan(0);
  });
  it("opens demo without pretending authentication", () => {
    wrap(<Landing />);
    fireEvent.click(screen.getByText("Explore demo"));
    expect(sessionStorage.getItem("edusmart-demo")).toBe("true");
  });
  it("switches to Kazakh", async () => {
    wrap(<LanguagePicker />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "kk" } });
    expect(i18n.language).toBe("kk");
    expect(localStorage.getItem("edusmart-language")).toBe("kk");
  });
  it("switches to Russian", () => {
    wrap(<LanguagePicker />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "ru" } });
    expect(i18n.t("dashboard")).toBe("Обзор");
  });
  it("switches to English", () => {
    wrap(<LanguagePicker />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
    expect(i18n.t("dashboard")).toBe("Overview");
  });
  it.each(["email", "password"])("renders login %s field", (field) => {
    wrap(<AuthPage mode="login" />);
    expect(
      screen.getByLabelText(field === "email" ? "Email address" : "Password"),
    ).toBeInTheDocument();
  });
  it("validates registration name", async () => {
    wrap(<AuthPage mode="register" />);
    fireEvent.submit(screen.getByRole("button", { name: "Create account" }));
    expect(
      await screen.findByText("This field is required"),
    ).toBeInTheDocument();
  });
  it("renders password recovery", () => {
    wrap(<AuthPage mode="recovery" />);
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });
  it("does not ask for role during registration", () => {
    wrap(<AuthPage mode="register" />);
    expect(screen.queryByLabelText("Role")).not.toBeInTheDocument();
  });
  it("shows configuration error without fake authentication", async () => {
    wrap(<AuthPage mode="login" />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "a@edu.kz" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secure123" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Connect Supabase",
    );
  });
  it("renders accessible modal", () => {
    wrap(
      <Modal open title="Delete record" onClose={() => {}}>
        Confirm
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Delete record");
  });
  it("disables pending actions", () => {
    render(<Button disabled>Submit</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
  it("renders meaningful empty state", () => {
    wrap(<Empty />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });
  it.each([
    ["kk", kk],
    ["ru", ru],
    ["en", en],
  ])("has complete keys in %s", (_, resource) => {
    expect(Object.keys(resource).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(resource).every((v) => v.length > 0)).toBe(true);
  });
  it("has no public service role token", () => {
    expect(import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });
  it("has working public navigation", () => {
    wrap(<Landing />);
    expect(
      screen.getAllByRole("link", { name: "About the platform" })[0],
    ).toHaveAttribute("href", "/about");
  });
  it("offers password reset navigation", () => {
    wrap(<AuthPage mode="login" />);
    expect(screen.getByText("Forgot password?")).toHaveAttribute(
      "href",
      "/recovery",
    );
  });
});
