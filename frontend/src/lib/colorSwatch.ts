// Best-effort mapping from a free-text filament color name to a CSS color
// for display purposes only. FilamentSpool.color has no hex/RGB column in
// the backend -- this never invents a color for a name it doesn't
// recognize (callers should render a neutral outline swatch instead).
// "Transparent"/"Clear"/"Natural" intentionally return null too: an empty
// outline is a more honest representation of "no fill" than any solid hex.
const KEYWORD_COLORS: [pattern: RegExp, css: string][] = [
  [/\b(black)\b/, "#1a1a1a"],
  [/\b(white)\b/, "#f5f5f5"],
  [/\b(gr[ae]y)\b/, "#808080"],
  [/\b(silver)\b/, "#c0c0c0"],
  [/\b(gold)\b/, "#d4af37"],
  [/\b(red)\b/, "#d32f2f"],
  [/\b(orange)\b/, "#f57c00"],
  [/\b(yellow)\b/, "#fbc02d"],
  [/\b(green)\b/, "#388e3c"],
  [/\b(blue)\b/, "#1976d2"],
  [/\b(purple|violet)\b/, "#7b1fa2"],
  [/\b(pink)\b/, "#ec407a"],
  [/\b(brown)\b/, "#6d4c41"],
];

export function guessSwatchColor(colorName: string | null | undefined): string | null {
  if (!colorName) return null;
  const normalized = colorName.trim().toLowerCase();
  for (const [pattern, css] of KEYWORD_COLORS) {
    if (pattern.test(normalized)) return css;
  }
  return null;
}

export const COLOR_PRESETS = [
  "Black",
  "White",
  "Gray",
  "Silver",
  "Red",
  "Orange",
  "Yellow",
  "Green",
  "Blue",
  "Purple",
  "Pink",
  "Brown",
  "Gold",
  "Transparent",
] as const;
