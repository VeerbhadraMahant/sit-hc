// Diverging sentiment scale: negative (#e34948) → neutral midpoint (#f0f1f5) → positive (#2a78d6).
const NEG = [227, 73, 72];
const MID = [240, 241, 245];
const POS = [42, 120, 214];

const mix = (a: number[], b: number[], t: number) => a.map((x, i) => Math.round(x + (b[i] - x) * t));

/** score in [-1, 1] → rgb color. */
export function divergingColor(score: number) {
  const s = Math.max(-1, Math.min(1, score));
  const [r, g, b] = s < 0 ? mix(MID, NEG, -s) : mix(MID, POS, s);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Ink that stays readable on top of divergingColor(score). */
export function inkOn(score: number) {
  return Math.abs(score) > 0.45 ? "#fcfcfd" : "#1d2130";
}

export function formatScore(score: number | null | undefined) {
  if (score == null) return "—";
  return `${score > 0 ? "+" : ""}${score.toFixed(2)}`;
}
