import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Inbox, ArrowUpRight, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
const variants = cva("button", {
  variants: {
    variant: {
      primary: "primary",
      secondary: "secondary",
      ghost: "ghost",
      danger: "danger",
    },
  },
  defaultVariants: { variant: "primary" },
});
export function Button({
  variant,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={twMerge(clsx(variants({ variant }), className))}
      {...props}
    />
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={"card " + className}>{children}</section>;
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}
export function Empty({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="empty">
      <span className="empty-icon">
        <Inbox size={28} />
      </span>
      <h3>{t("empty")}</h3>
      <p>{t("emptyBody")}</p>
      {children}
    </div>
  );
}
export function Loading() {
  const { t } = useTranslation();
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      {t("loading")}
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{title}</Dialog.Description>
          <Dialog.Close asChild>
            <button aria-label={t("cancel")} className="modal-close">
              <X />
            </button>
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function PageTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">EDUSMART / {new Date().getFullYear()}</p>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
export function SectionTitle({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {children && (
        <span>
          {children}
          <ArrowUpRight size={15} />
        </span>
      )}
    </div>
  );
}
