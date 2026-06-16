/**
 * Gera public/sounds/kaching.wav — efeito clássico de caixa registadora (ca-ching).
 * Correr: node scripts/generate-kaching-wav.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "sounds");
const outPath = join(outDir, "kaching.wav");

const sampleRate = 44100;
const duration = 0.85;
const samples = Math.floor(sampleRate * duration);
const data = new Float32Array(samples);

function envAttackDecay(t, start, attack, decay, sustain = 0.55, length = 0.35) {
  const local = t - start;
  if (local < 0 || local > length) return 0;
  const a = Math.min(1, local / attack);
  const d = Math.exp(-Math.max(0, local - attack) * decay);
  return a * (sustain + (1 - sustain) * d);
}

/** «Ca» — golpe metálico grave da gaveta. */
function registerCa(t, start) {
  const local = t - start;
  if (local < 0 || local > 0.12) return 0;
  const e = envAttackDecay(t, start, 0.004, 28, 0.4, 0.12);
  const thud =
    Math.sin(2 * Math.PI * 180 * local) * 0.35 +
    Math.sin(2 * Math.PI * 360 * local) * 0.2;
  const metal = Math.sin(2 * Math.PI * 920 * local) * Math.exp(-local * 35) * 0.45;
  return (thud + metal) * e * 0.75;
}

/** «Ching» — sino metálico brilhante da caixa (o som icónico). */
function registerChing(t, start, freq, amp) {
  const local = t - start;
  if (local < 0 || local > 0.55) return 0;
  const e = envAttackDecay(t, start, 0.003, 5.5, 0.35, 0.55);
  const bell =
    Math.sin(2 * Math.PI * freq * local) * 0.55 +
    Math.sin(2 * Math.PI * freq * 2.01 * local) * 0.28 +
    Math.sin(2 * Math.PI * freq * 3.04 * local) * 0.12 +
    Math.sin(2 * Math.PI * freq * 4.8 * local) * 0.05;
  return bell * e * amp;
}

/** Moeda a cair no tabuleiro. */
function coinDrop(t, start, freq, amp) {
  const local = t - start;
  if (local < 0 || local > 0.14) return 0;
  const e = Math.exp(-local * 22);
  const ping =
    Math.sin(2 * Math.PI * freq * local) * 0.65 +
    Math.sin(2 * Math.PI * freq * 2.1 * local) * 0.2;
  return ping * e * amp;
}

for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  let s = 0;

  // Ca-ching clássico: «ca» + «ching» duplo (como caixa registadora vintage)
  s += registerCa(t, 0.02);
  s += registerChing(t, 0.08, 2480, 0.95);
  s += registerChing(t, 0.11, 3720, 0.55);
  s += registerChing(t, 0.22, 2100, 0.72);
  s += registerChing(t, 0.25, 3150, 0.38);

  // Moedas a confirmar a venda
  s += coinDrop(t, 0.38, 3400, 0.42);
  s += coinDrop(t, 0.42, 2850, 0.32);
  s += coinDrop(t, 0.455, 4100, 0.28);

  // Eco final de caixa
  if (t >= 0.5 && t < 0.78) {
    const local = t - 0.5;
    const e = Math.exp(-local * 8);
    s += Math.sin(2 * Math.PI * 1680 * local) * e * 0.18;
    s += Math.sin(2 * Math.PI * 2520 * local) * e * 0.1;
  }

  data[i] = Math.max(-1, Math.min(1, s * 0.82));
}

function encodeWav(floatSamples) {
  const dataSize = floatSamples.length * 2;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const writeStr = (offset, str) => {
    for (let j = 0; j < str.length; j++) view.setUint8(offset + j, str.charCodeAt(j));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < floatSamples.length; i++) {
    const sample = floatSamples[i];
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return Buffer.from(ab);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, encodeWav(data));
console.log(`Wrote ${outPath} (${samples} samples, ${duration}s)`);
