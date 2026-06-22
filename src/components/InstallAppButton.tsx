import { isAdminPreviewMode } from "@/lib/tenantPreview";
import { isNativeApp, isStandalonePwa } from "@/lib/nativeApp";

/** Confirma estes links na App Store Connect / Google Play Console. */
const APP_STORE_URL = "https://apps.apple.com/app/kebab-turco/id6753089684";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.eurobusinessgroup.kebabturco";

interface Props {
  lang?: string;
  variant?: "primary" | "subtle";
}

const LABELS: Record<string, { appStore: string; playStore: string }> = {
  pt: { appStore: "Disponível na App Store", playStore: "Disponível no Google Play" },
  en: { appStore: "Download on the App Store", playStore: "Get it on Google Play" },
  es: { appStore: "Disponible en App Store", playStore: "Disponible en Google Play" },
  fr: { appStore: "Télécharger sur l'App Store", playStore: "Disponible sur Google Play" },
};

const AppleIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-current">
    <path d="M16.365 1.43c0 1.14-.493 2.22-1.277 3.034-.88.92-2.32 1.63-3.56 1.53-.15-1.09.48-2.26 1.23-3.01.84-.87 2.31-1.56 3.61-1.56zM20.88 17.17c-.57 1.31-.85 1.9-1.59 3.06-1.03 1.58-2.48 3.55-4.28 3.57-1.6.02-2.01-1.04-4.18-1.04-2.17 0-2.64 1.06-4.2 1.07-1.8.01-3.17-1.75-4.2-3.33-2.88-4.4-3.18-9.55-1.4-12.3 1.26-1.95 3.26-3.09 5.14-3.09 1.91 0 3.11 1.04 4.69 1.04 1.53 0 2.46-1.04 4.66-1.04 1.66 0 3.42.9 4.68 2.46-4.11 2.24-3.45 8.07.68 9.6z" />
  </svg>
);

const PlayIcon = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 shrink-0 fill-current">
    <path d="M3.6 2.4 20.4 12 3.6 21.6V2.4zm2.4 2.89v13.42L17.21 12 6 5.29z" />
  </svg>
);

const StoreBadge = ({
  href,
  label,
  icon,
  subtle,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  subtle: boolean;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={
      subtle
        ? "flex flex-1 min-w-0 items-center justify-center gap-2 rounded-xl border border-border/40 bg-foreground px-3 py-2.5 text-background active:scale-[0.98] transition-transform"
        : "flex flex-1 min-w-0 items-center justify-center gap-2.5 rounded-2xl bg-foreground px-4 py-3 text-background shadow-lg active:scale-[0.98] transition-transform"
    }
  >
    {icon}
    <span className={`font-semibold leading-tight text-left ${subtle ? "text-[10px]" : "text-[11px]"}`}>
      {label}
    </span>
  </a>
);

const InstallAppButton = ({ lang = "es", variant = "primary" }: Props) => {
  const t = LABELS[lang] || LABELS.es;
  const subtle = variant === "subtle";

  if (isAdminPreviewMode()) return null;
  if (isNativeApp()) return null;
  if (isStandalonePwa()) return null;

  return (
    <div className={`flex w-full max-w-md mx-auto gap-2.5 ${subtle ? "" : "px-1"}`}>
      <StoreBadge href={APP_STORE_URL} label={t.appStore} icon={<AppleIcon />} subtle={subtle} />
      <StoreBadge href={PLAY_STORE_URL} label={t.playStore} icon={<PlayIcon />} subtle={subtle} />
    </div>
  );
};

export default InstallAppButton;
