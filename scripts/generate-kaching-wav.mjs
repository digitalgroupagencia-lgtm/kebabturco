/**
 * Gera public/sounds/kaching.wav — «Ding!» alegre + moedas / caixa registadora.
 * Correr: node scripts/generate-kaching-wav.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "sounds");
const outPath = join(outDir, "kaching.wav");

const sampleRate = 44100;
const duration = 0.58;
const samples = Math.floor(sampleRate * duration);
const data = new Float32Array(samples);

/** «Ding» metálico alegre (sino de notificação). */
function cheerfulDing(t, start, freq, amp) {
  const local = t - start;
  if (local < 0 || local > 0.16) return 0;
  const attack = Math.min(1, local * 80);
  const env = attack * Math.exp(-local * 11);
  const bell =
    Math.sin(2 * Math.PI * freq * local) * 0.58 +
    Math.sin(2 * Math.PI * freq * 2.76 * local) * 0.28 +
    Math.sin(2 * Math.PI * freq * 5.4 * local) * 0.12 +
    Math.sin(2 * Math.PI * freq * 8.2 * local) * 0.04;
  return bell * env * amp;
}

/** Ping de moeda (freq Hz, início s, volume, decay). */
function coinPing(t, start, freq, amp, decay) {
  const local = t - start;
  if (local < 0 || local > 0.18) return 0;
  const env = Math.exp(-local * decay);
  const ping =
    Math.sin(2 * Math.PI * freq * local) * 0.7 +
    Math.sin(2 * Math.PI * freq * 2.05 * local) * 0.2 +
    Math.sin(2 * Math.PI * freq * 3.1 * local) * 0.06;
  const clink = (Math.random() * 2 - 1) * Math.exp(-local * (decay * 1.5)) * 0.1;
  return (ping * env + clink) * amp;
}

const coinDrops = [
  [0.1, 3680, 0.55, 21],
  [0.13, 3120, 0.48, 18],
  [0.155, 4280, 0.42, 23],
  [0.18, 2860, 0.36, 17],
  [0.205, 3960, 0.3, 22],
];

for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  let s = 0;

  // «Ding!» inicial — curto e alegre
  s += cheerfulDing(t, 0.0, 1174, 0.92);
  s += cheerfulDing(t, 0.002, 1760, 0.18);

  for (const [start, freq, amp, decay] of coinDrops) {
    s += coinPing(t, start, freq, amp, decay);
  }

  // «Ching» de caixa registadora (confirmação de venda)
  if (t >= 0.28 && t < 0.52) {
    const local = t - 0.28;
    const env = Math.exp(-local * 7.5);
    s += Math.sin(2 * Math.PI * 1620 * local) * env * 0.42;
    s += Math.sin(2 * Math.PI * 3240 * local) * env * 0.22;
    s += Math.sin(2 * Math.PI * 4860 * local) * env * 0.08;
  }

  // Moeda final no tabuleiro
  if (t >= 0.38 && t < 0.56) {
    const local = t - 0.38;
    const env = Math.exp(-local * 10);
    s += Math.sin(2 * Math.PI * 2380 * local) * env * 0.2;
    s += (Math.random() * 2 - 1) * env * 0.05;
  }

  data[i] = Math.max(-1, Math.min(1, s * 0.85));
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
