import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function readIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  const staffWide = document.documentElement.classList.contains("staff-landscape-layout");
  const landscape = window.innerWidth > window.innerHeight;
  if (staffWide && landscape) return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const onChange = () => setIsMobile(readIsMobile());
    onChange();
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);

  return !!isMobile;
}
