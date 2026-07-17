import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const COLOR_OPTIONS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

interface ConnectionColorPickerProps {
  value: string | undefined;
  onChange: (color: string | undefined) => void;
}

export function ConnectionColorPicker({
  value,
  onChange,
}: Readonly<ConnectionColorPickerProps>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Color</Label>
      <div className="flex gap-2">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            className={cn(
              "size-8 rounded-full border-2 transition-transform hover:scale-110",
              value === c
                ? "border-foreground scale-110"
                : "border-transparent",
            )}
            style={{ backgroundColor: c }}
            onClick={() => onChange(value === c ? undefined : c)}
            aria-label={`Select color ${c}`}
          />
        ))}
      </div>
    </div>
  );
}
