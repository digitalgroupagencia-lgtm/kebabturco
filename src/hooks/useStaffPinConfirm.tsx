import { useCallback, useRef, useState } from "react";
import StaffPinConfirmDialog, { type StaffPinConfirmOptions } from "@/components/tapToPay/StaffPinConfirmDialog";

export function useStaffPinConfirm() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<StaffPinConfirmOptions | undefined>();
  const resolverRef = useRef<((pin: string | null) => void) | null>(null);
  const settledRef = useRef(false);

  const requestStaffPin = useCallback((opts?: StaffPinConfirmOptions) => {
    settledRef.current = false;
    setOptions(opts);
    setOpen(true);
    return new Promise<string | null>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const finish = useCallback((pin: string | null) => {
    if (settledRef.current) return;
    settledRef.current = true;
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(pin);
    setOpen(false);
    setOptions(undefined);
  }, []);

  const StaffPinDialog = useCallback(
    () => (
      <StaffPinConfirmDialog
        open={open}
        options={options}
        onOpenChange={(next) => {
          if (!next && !settledRef.current) finish(null);
        }}
        onConfirm={(pin) => finish(pin)}
      />
    ),
    [open, options, finish],
  );

  return { requestStaffPin, StaffPinDialog };
}
