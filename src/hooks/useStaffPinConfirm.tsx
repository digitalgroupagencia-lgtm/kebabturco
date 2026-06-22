import { useCallback, useRef, useState } from "react";
import StaffPinConfirmDialog, { type StaffPinConfirmOptions } from "@/components/tapToPay/StaffPinConfirmDialog";

export function useStaffPinConfirm() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<StaffPinConfirmOptions | undefined>();
  const resolverRef = useRef<((pin: string | null) => void) | null>(null);

  const requestStaffPin = useCallback((opts?: StaffPinConfirmOptions) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const finish = useCallback((pin: string | null) => {
    resolverRef.current?.(pin);
    resolverRef.current = null;
    setOpen(false);
    setOptions(undefined);
  }, []);

  const StaffPinDialog = useCallback(
    () => (
      <StaffPinConfirmDialog
        open={open}
        options={options}
        onOpenChange={(next) => {
          if (!next) finish(null);
        }}
        onConfirm={(pin) => finish(pin)}
      />
    ),
    [open, options, finish],
  );

  return { requestStaffPin, StaffPinDialog };
}
