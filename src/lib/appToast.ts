import { toast, type ExternalToast } from "sonner";

const BRANDED: ExternalToast = {
  duration: 2500,
  position: "bottom-center",
  classNames: {
    toast:
      "!bg-primary !text-primary-foreground !border-primary/25 shadow-lg rounded-2xl font-bold text-sm",
    description: "!text-primary-foreground/85",
    icon: "!text-primary-foreground",
  },
};

export function appToastSuccess(message: string, options?: ExternalToast) {
  toast.success(message, { ...BRANDED, ...options });
}

export function appToastError(message: string, options?: ExternalToast) {
  toast.error(message, {
    ...BRANDED,
    classNames: {
      ...BRANDED.classNames,
      toast:
        "!bg-destructive !text-destructive-foreground !border-destructive/25 shadow-lg rounded-2xl font-bold text-sm",
    },
    ...options,
  });
}

export function appToastInfo(message: string, options?: ExternalToast) {
  toast.info(message, { ...BRANDED, ...options });
}
