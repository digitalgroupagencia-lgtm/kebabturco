#!/usr/bin/env node
/**
 * A Lovable por vezes repõe StaffLogin.tsx com teclado numérico antigo.
 * Garante login da equipa só com e-mail + senha antes de dev/build.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const staffScreen = path.join(root, "src", "components", "staff", "StaffEmailLoginScreen.tsx");
const staffPage = path.join(root, "src", "pages", "StaffLogin.tsx");
const template = path.join(root, "scripts", "templates", "StaffEmailLoginScreen.tsx");

const LEGACY_MARKERS = [
  "appendChar",
  "loginWithStaffPin",
  "STAFF_PIN_PATTERN",
  "482917#",
  "Introduzca el código",
  "código que el restaurante",
  "emailDivider",
  "Entrar con correo",
  "pinReady",
  "backspace",
];

const PAGE_STUB = `/** A rota /staff usa o ecrã em components/staff (a Lovable não deve sobrescrever). */
export { default } from "@/components/staff/StaffEmailLoginScreen";
`;

function hasLegacyPinLogin(source) {
  return LEGACY_MARKERS.some((marker) => source.includes(marker));
}

function writeIfChanged(filePath, content) {
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (prev === content) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`[ensure-staff-email-login] fixed ${path.relative(root, filePath)}`);
  return true;
}

let changed = false;

if (fs.existsSync(template)) {
  const templateSource = fs.readFileSync(template, "utf8");
  const screenSource = fs.existsSync(staffScreen) ? fs.readFileSync(staffScreen, "utf8") : "";
  if (!screenSource || hasLegacyPinLogin(screenSource)) {
    changed = writeIfChanged(staffScreen, templateSource) || changed;
  }
} else if (fs.existsSync(staffScreen) && hasLegacyPinLogin(fs.readFileSync(staffScreen, "utf8"))) {
  console.error("[ensure-staff-email-login] legacy pin UI detected but template missing");
  process.exit(1);
}

const pageSource = fs.existsSync(staffPage) ? fs.readFileSync(staffPage, "utf8") : "";
if (!pageSource || hasLegacyPinLogin(pageSource) || !pageSource.includes("StaffEmailLoginScreen")) {
  changed = writeIfChanged(staffPage, PAGE_STUB) || changed;
}

if (!changed) {
  console.log("[ensure-staff-email-login] ok — email + password only");
}
