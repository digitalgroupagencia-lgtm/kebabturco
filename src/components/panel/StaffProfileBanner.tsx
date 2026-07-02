import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStaffT } from "@/hooks/useStaffT";
import { nav } from "@/lib/navPaths";
import { fetchMyStaffProfile, isStaffProfileIncomplete } from "@/services/staffProfile";
import { hasMyStaffAccessPin } from "@/services/sellerSetupService";

/** Lembra a equipa de completar nome, foto e código de cobro. */
export default function StaffProfileBanner() {
  const { user } = useAuth();
  const { t } = useStaffT();
  const [show, setShow] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setShow(false);
      return;
    }
    try {
      const [profile, pinReady] = await Promise.all([
        fetchMyStaffProfile(user.id),
        hasMyStaffAccessPin(user.id),
      ]);
      setShow(isStaffProfileIncomplete(profile) || !profile?.avatar_url || !pinReady);
    } catch {
      setShow(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onChanged = () => void refresh();
    window.addEventListener("kebab-staff-setup-changed", onChanged);
    return () => window.removeEventListener("kebab-staff-setup-changed", onChanged);
  }, [refresh]);

  if (!show) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{t("profile.banner.title")}</p>
          <p className="text-sm text-muted-foreground">{t("profile.banner.body")}</p>
        </div>
      </div>
      <Link
        to={nav.panel("my-profile")}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground"
      >
        {t("profile.banner.action")}
      </Link>
    </div>
  );
}
