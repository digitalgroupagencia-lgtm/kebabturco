import { DIAL_OPTIONS, DEFAULT_DIAL_CODE, sanitizeLocalPhone } from "@/lib/phoneNumber";

type PhoneInputProps = {
  dialCode: string;
  onDialCodeChange: (code: string) => void;
  localNumber: string;
  onLocalNumberChange: (value: string) => void;
  error?: boolean;
  placeholder?: string;
  className?: string;
};

const PhoneInput = ({
  dialCode,
  onDialCodeChange,
  localNumber,
  onLocalNumberChange,
  error = false,
  placeholder = "612 345 678",
  className = "",
}: PhoneInputProps) => (
  <div className={`flex gap-2 ${className}`}>
    <select
      value={dialCode || DEFAULT_DIAL_CODE}
      onChange={(e) => onDialCodeChange(e.target.value)}
      aria-label="Indicativo do país"
      className={`h-10 shrink-0 max-w-[118px] px-2 text-sm font-bold bg-secondary/60 rounded-xl border-2 focus:outline-none focus:border-primary ${
        error ? "border-destructive/60" : "border-transparent"
      }`}
    >
      {DIAL_OPTIONS.map((opt) => (
        <option key={opt.code} value={opt.code}>
          {opt.flag} {opt.code}
        </option>
      ))}
    </select>
    <input
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      value={localNumber}
      onChange={(e) => onLocalNumberChange(sanitizeLocalPhone(e.target.value))}
      placeholder={placeholder}
      className={`flex-1 min-w-0 h-10 px-3 text-sm font-bold bg-secondary/60 rounded-xl border-2 focus:outline-none focus:border-primary ${
        error ? "border-destructive/60" : "border-transparent"
      }`}
    />
  </div>
);

export default PhoneInput;
