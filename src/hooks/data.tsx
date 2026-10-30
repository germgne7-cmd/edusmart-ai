import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "../app/context";
import { Button, Card, Loading } from "../components/ui";
export function useAction() {
  const { toast, notifyError, refresh } = useApp();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    run: async (fn: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await fn();
        refresh();
        toast(t("saved"));
        return true;
      } catch (e) {
        notifyError(e);
        return false;
      } finally {
        setBusy(false);
      }
    },
  };
}
export function DataGuard({
  queries,
  children,
}: {
  queries: any[];
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  if (queries.some((q) => q.isPending)) return <Loading />;
  const failed = queries.filter((q) => q.isError);
  if (failed.length)
    return (
      <Card>
        <p role="alert">{t("error")}</p>
        <Button onClick={() => failed.forEach((q) => q.refetch())}>
          {t("retry")}
        </Button>
      </Card>
    );
  return <>{children}</>;
}
