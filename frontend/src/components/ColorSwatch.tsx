import { guessSwatchColor } from "@/lib/colorSwatch";
import { cn } from "@/lib/utils";

interface ColorSwatchProps {
  color: string | null | undefined;
  className?: string;
}

/** Small circular swatch for a filament's free-text color name. Shows a
 * best-effort fill for recognized color words, or a neutral outline ring
 * for anything unrecognized -- never fabricates a color. */
export function ColorSwatch({ color, className }: ColorSwatchProps) {
  const css = guessSwatchColor(color);
  return (
    <span
      title={color ?? "No color set"}
      className={cn(
        "inline-block size-3 shrink-0 rounded-full border",
        css ? "border-black/10 dark:border-white/10" : "border-dashed border-muted-foreground/50",
        className,
      )}
      style={css ? { backgroundColor: css } : undefined}
    />
  );
}
