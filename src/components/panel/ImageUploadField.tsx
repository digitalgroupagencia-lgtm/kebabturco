import { useRef } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  label: string;
  dimensions?: string;
  hint?: string;
  value: string;
  uploading?: boolean;
  disabled?: boolean;
  onPickFile: (file: File) => void | Promise<void>;
};

const ImageUploadField = ({
  label,
  dimensions,
  hint,
  value,
  uploading = false,
  disabled = false,
  onPickFile,
}: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 flex-wrap">
        <ImageIcon className="h-4 w-4" />
        {label}
        {dimensions && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {dimensions}
          </span>
        )}
      </Label>
      <div className="flex items-center gap-3 p-3 rounded-2xl border bg-muted/30">
        <div className="w-20 h-20 rounded-2xl bg-background overflow-hidden flex items-center justify-center border shrink-0">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onPickFile(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {uploading ? "A enviar…" : value ? "Trocar imagem" : "Enviar imagem"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {hint ||
              (dimensions
                ? `Tamanho recomendado: ${dimensions} · PNG / JPG / WEBP · máx. 5 MB`
                : "PNG / JPG / WEBP · máx. 5 MB")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadField;
