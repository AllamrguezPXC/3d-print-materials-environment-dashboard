import { ColorSwatch } from "@/components/ColorSwatch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLOR_PRESETS } from "@/lib/colorSwatch";

interface ColorSwatchPickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

/** Color name input with a live swatch preview and a row of common filament
 * color presets. Clicking a preset just fills the same free-text field --
 * a custom name is always still allowed. */
export function ColorSwatchPicker({ value, onChange, id }: ColorSwatchPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Color</Label>
      <div className="flex items-center gap-2">
        <ColorSwatch color={value} />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Color name…"
          className="w-36"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            title={preset}
            onClick={() => onChange(preset)}
            className="rounded-full p-0.5 transition-transform hover:scale-110"
          >
            <ColorSwatch color={preset} className="size-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
