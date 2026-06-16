/**
 * Gera public/sounds/kaching.wav — som tipo caixa registadora (ka-ching).
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

for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  let s = 0;

  // «Ka» — clique curto da gaveta
  if (t < 0.045) {
    s += (Math.random() * 2 - 1) * Math.exp(-t * 140) * 0.32;
    s += Math.sin(2 * Math.PI * 160 * t) * Math.exp(-t * 90) * 0.22;
  }

  // «Ching» — sino metálico principal
  if (t >= 0.028 && t < 0.38) {
    const local = t - 0.028;
    const env = Math.exp(-local * 7.5);
    s += Math.sin(2 * Math.PI * 2150 * local) * env * 0.48;
    s += Math.sin(2 * Math.PI * 4300 * local) * env * 0.24;
    s += Math.sin(2 * Math.PI * 6450 * local) * env * 0.09;
  }

  // Segundo «ching» mais suave (moedas / confirmação)
  if (t >= 0.36 && t < 0.56) {
    const local = t - 0.36;
    const env = Math.exp(-local * 11);
    s += Math.sin(2 * Math.PI * 2750 * local) * env * 0.3;
    s += Math.sin(2 * Math.PI * 5500 * local) * env * 0.12;
  }

  data[i] = Math.max(-1, Math.min(1, s * 0.92));
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
