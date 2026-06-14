import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  width?: "default" | "wide" | "full";
};

const widthCls = {
  default: "max-w-5xl staff-wide:max-w-[1600px]",
  wide: "max-w-7xl staff-wide:max-w-[1600px]",
  full: "max-w-[1400px] staff-wide:max-w-[1600px]",
};

export default function PlatformPageShell({ children, className, width = "wide" }: Props) {
  return (
    <div className={cn("mx-auto w-full space-y-6 pb-10", widthCls[width], className)}>
      {children}
    </div>
  );
}
