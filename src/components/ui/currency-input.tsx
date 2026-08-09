import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatNumber } from "@/lib/format";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value: number | null | undefined;
  onChange: (value: number) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, placeholder, disabled, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement | null>(null);

    React.useImperativeHandle(ref, () => internalRef.current!);

    const getFormatted = (val: number | null | undefined): string => {
      if (val == null || Number.isNaN(val) || val === 0) return "";
      return formatNumber(val);
    };

    const [displayVal, setDisplayVal] = React.useState<string>(() => getFormatted(value));

    React.useEffect(() => {
      const parsedCurrentDisplay = displayVal ? parseInt(displayVal.replace(/[^\d]/g, ""), 10) : 0;
      const numericExternal = value ?? 0;
      if (numericExternal !== parsedCurrentDisplay) {
        setDisplayVal(getFormatted(value));
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputEl = e.target;
      const rawVal = inputEl.value;
      const selectionStart = inputEl.selectionStart ?? rawVal.length;

      const digitsBeforeCursor = rawVal.slice(0, selectionStart).replace(/[^\d]/g, "").length;

      const rawDigits = rawVal.replace(/[^\d]/g, "");
      if (!rawDigits) {
        setDisplayVal("");
        onChange(0);
        return;
      }

      const numVal = parseInt(rawDigits, 10);
      const formatted = formatNumber(numVal);

      setDisplayVal(formatted);
      onChange(numVal);

      requestAnimationFrame(() => {
        if (!internalRef.current) return;
        let newCursorPos = 0;
        let digitCount = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (/\d/.test(formatted[i])) {
            digitCount++;
          }
          if (digitCount === digitsBeforeCursor) {
            newCursorPos = i + 1;
            break;
          }
        }
        if (digitsBeforeCursor === 0) newCursorPos = 0;
        internalRef.current.setSelectionRange(newCursorPos, newCursorPos);
      });
    };

    return (
      <Input
        ref={internalRef}
        type="text"
        inputMode="numeric"
        value={displayVal}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        {...props}
      />
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";
