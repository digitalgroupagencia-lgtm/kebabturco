import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SecretInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  defaultVisible?: boolean;
};

const SecretInput = React.forwardRef<HTMLInputElement, SecretInputProps>(
  ({ className, visible, onVisibleChange, defaultVisible = false, ...rest }, ref) => {
    const { type: _ignoredType, ...props } = rest as typeof rest & { type?: string };
    const [internalVisible, setInternalVisible] = React.useState(defaultVisible);
    const isControlled = visible !== undefined;
    const shown = isControlled ? visible : internalVisible;

    const toggle = () => {
      const next = !shown;
      if (isControlled) {
        onVisibleChange?.(next);
      } else {
        setInternalVisible(next);
        onVisibleChange?.(next);
      }
    };

    return (
      <div className="relative w-full min-w-0">
        <Input
          ref={ref}
          type={shown ? "text" : "password"}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className={cn("pr-10", !shown && "font-mono tracking-[0.35em]", className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full w-10 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={toggle}
          aria-label={shown ? "Ocultar" : "Mostrar"}
          tabIndex={-1}
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    );
  },
);

SecretInput.displayName = "SecretInput";

export { SecretInput };
