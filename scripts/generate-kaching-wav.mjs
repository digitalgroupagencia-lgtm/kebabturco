/**
 * Gera public/sounds/kaching.wav — moedas a cair (alerta de nova venda).
 * Correr: node scripts/generate-kaching-wav.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "sounds");
const outPath = join(outDir, "kaching.wav");

const sampleRate = 44100;
const duration = 0.72;
const samples = Math.floor(sampleRate * duration);
const data = new Float32Array(samples);

/** Ping metálico de moeda (freq Hz, início s, volume, decay). */
function coinPing(t, start, freq, amp, decay) {
  const local = t - start;
  if (local < 0 || local > 0.22) return 0;
  const env = Math.exp(-local * decay);
  const ping =
    Math.sin(2 * Math.PI * freq * local) * 0.72 +
    Math.sin(2 * Math.PI * freq * 2.03 * local) * 0.22 +
    Math.sin(2 * Math.PI * freq * 3.07 * local) * 0.06;
  const clink = (Math.random() * 2 - 1) * Math.exp(-local * (decay * 1.4)) * 0.12;
  return (ping * env + clink) * amp;
}

const coinDrops = [
  [0.0, 3520, 0.62, 22],
  [0.035, 2980, 0.52, 19],
  [0.065, 4100, 0.48, 24],
  [0.095, 2740, 0.42, 17],
  [0.125, 3360, 0.38, 21],
  [0.155, 3880, 0.34, 23],
  [0.185, 3120, 0.3, 18],
  [0.21, 4450, 0.26, 26],
];

for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  let s = 0;

  for (const [start, freq, amp, decay] of coinDrops) {
    s += coinPing(t, start, freq, amp, decay);
  }

  // «Ching» final de caixa (confirmação de venda)
  if (t >= 0.24 && t < 0.58) {
    const local = t - 0.24;
    const env = Math.exp(-local * 6.2);
    s += Math.sin(2 * Math.PI * 1580 * local) * env * 0.38;
    s += Math.sin(2 * Math.PI * 3160 * local) * env * 0.2;
    s += Math.sin(2 * Math.PI * 4740 * local) * env * 0.08;
  }

  // Moeda final mais grave (cai no tabuleiro)
  if (t >= 0.42 && t < 0.68) {
    const local = t - 0.42;
    const env = Math.exp(-local * 9);
    s += Math.sin(2 * Math.PI * 2200 * local) * env * 0.22;
    s += (Math.random() * 2 - 1) * env * 0.06;
  }

  data[i] = Math.max(-1, Math.min(1, s * 0.88));
}

function encodeWav(floatSamples) {
  const dataSize = floatSamples.length * 2;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
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
