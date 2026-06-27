import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function readIsMobile(): boolean {
  if (typeof window === "undefined") return false;
  const staffWide = document.documentElement.classList.contains("staff-landscape-layout");
  const cssRotated = document.body.classList.contains("fp-rotate");
  const effectiveWidth = cssRotated ? window.innerHeight : window.innerWidth;
  const effectiveHeight = cssRotated ? window.innerWidth : window.innerHeight;
  const landscape = effectiveWidth > effectiveHeight;
  if (staffWide && landscape) return false;
  return effectiveWidth < MOBILE_BREAKPOINT;
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
