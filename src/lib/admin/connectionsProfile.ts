export type DeployMode = "full-native" | "tablet-capacitor" | "web-only";

export type ConnectionsProfile = {
  projectName: string;
  projectSlug: string;
  domain: string;
  iosBundleId: string;
  androidPackage: string;
  githubOrg: string;
  githubRepo: string;
  lovableProjectName: string;
  supabaseProjectRef: string;
  supabaseUrl: string;
  appleTeamId: string;
  appleTeamName: string;
  codemagicIntegration: string;
  firebaseProjectId: string;
  deployMode: DeployMode;
};

export const KEBAB_TURCO_PROFILE: ConnectionsProfile = {
  projectName: "Kebab Turco",
  projectSlug: "kebabturco",
  domain: "kebabturco.net",
  iosBundleId: "net.kebabturco.app",
  androidPackage: "com.eurobusinessgroup.kebabturco",
  githubOrg: "digitalgroupagencia-lgtm",
  githubRepo: "kebabturco",
  lovableProjectName: "kebabturco",
  supabaseProjectRef: "kvpssbhclafoymhecmuk",
  supabaseUrl: "https://kvpssbhclafoymhecmuk.supabase.co",
  appleTeamId: "4QW32SBR7H",
  appleTeamName: "GROUP EURO BUSINESS",
  codemagicIntegration: "kebabturco",
  firebaseProjectId: "kebab-turco-gandia",
  deployMode: "full-native",
};

const STORAGE_KEY = "admin-connections-profile-v1";

export function loadConnectionsProfile(): ConnectionsProfile {
  if (typeof window === "undefined") return { ...KEBAB_TURCO_PROFILE };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...KEBAB_TURCO_PROFILE };
    return { ...KEBAB_TURCO_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...KEBAB_TURCO_PROFILE };
  }
}

export function saveConnectionsProfile(profile: ConnectionsProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function slugifyProjectName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 32);
}

export function deriveBundleIds(slug: string, domain: string): { ios: string; android: string } {
  const clean = slug || "restaurant";
  return {
    ios: `net.${clean}.app`,
    android: `com.${domain.split(".")[0] || clean}.${clean}`,
  };
}

export type ConnectionVars = Record<string, string>;

export function buildConnectionVars(p: ConnectionsProfile): ConnectionVars {
  const slug = p.projectSlug || slugifyProjectName(p.projectName);
  const certAppStore = `${slug}_appstore`;
  const certDev = `${slug}_dev`;
  const keystore = `${slug}_play`;
  const githubUrl = `https://github.com/${p.githubOrg}/${p.githubRepo}`;
  const lovableGitRemote = `https://github.com/${p.githubOrg}/${p.githubRepo}-a693f325.git`;

  return {
    projectName: p.projectName,
    projectSlug: slug,
    domain: p.domain,
    siteUrl: `https://${p.domain}`,
    iosBundleId: p.iosBundleId,
    androidPackage: p.androidPackage,
    githubOrg: p.githubOrg,
    githubRepo: p.githubRepo,
    githubUrl,
    lovableGitRemote,
    lovableProjectName: p.lovableProjectName,
    supabaseProjectRef: p.supabaseProjectRef,
    supabaseUrl: p.supabaseUrl,
    supabaseDashboard: `https://supabase.com/dashboard/project/${p.supabaseProjectRef}`,
    appleTeamId: p.appleTeamId,
    appleTeamName: p.appleTeamName,
    codemagicIntegration: p.codemagicIntegration,
    codemagicCertAppStore: certAppStore,
    codemagicCertDev: certDev,
    codemagicKeystore: keystore,
    appleProfileAppStore: `${p.projectName} App Store`,
    appleProfileDev: `${p.projectName} Development`,
    firebaseProjectId: p.firebaseProjectId,
    deployMode: p.deployMode,
  };
}

export function interpolateConnectionText(template: string, vars: ConnectionVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

const CHECKLIST_PREFIX = "admin-connections-checks-v1";

export function loadConnectionChecks(slug: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`${CHECKLIST_PREFIX}:${slug}`);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function saveConnectionCheck(slug: string, stepId: string, done: boolean): void {
  const all = loadConnectionChecks(slug);
  if (done) all[stepId] = true;
  else delete all[stepId];
  try {
    localStorage.setItem(`${CHECKLIST_PREFIX}:${slug}`, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
