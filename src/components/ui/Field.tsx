import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

interface FieldProps {
  label?: string;
  /** Optional hint shown next to the label. */
  hint?: string;
  /** Error message; shows a danger state when present. */
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Labeled form field with optional hint and inline error message. */
export function Field({ label, hint, error, required, children, className = "" }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink">
          {label}
          {required && <span className="text-danger">*</span>}
          {hint && !required && (
            <span className="text-xs font-normal text-muted">({hint})</span>
          )}
        </span>
      )}
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const INPUT_BASE =
  "w-full rounded-xl border bg-surface2 px-3.5 py-3 text-[15px] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-primary/60 [color-scheme:light_dark]";

function inputClass(error?: string): string {
  return `${INPUT_BASE} ${error ? "border-danger/60" : "border-line"}`;
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export function TextInput({ error, className = "", ...rest }: TextInputProps) {
  return <input className={`${inputClass(error)} ${className}`} {...rest} />;
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export function TextArea({ error, className = "", ...rest }: TextAreaProps) {
  return <textarea className={`${inputClass(error)} resize-none ${className}`} {...rest} />;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export function Select({ error, className = "", children, ...rest }: SelectProps) {
  return (
    <select className={`${inputClass(error)} appearance-none ${className}`} {...rest}>
      {children}
    </select>
  );
}

/** Date input (YYYY-MM-DD) styled consistently. */
export function DateInput({ error, className = "", ...rest }: TextInputProps) {
  return (
    <input type="date" className={`${inputClass(error)} ${className}`} {...rest} />
  );
}

/** Time input (HH:mm) styled consistently. */
export function TimeInput({ error, className = "", ...rest }: TextInputProps) {
  return (
    <input type="time" className={`${inputClass(error)} ${className}`} {...rest} />
  );
}

/** Numeric amount input with right alignment for readability. */
export function AmountInput({ error, className = "", ...rest }: TextInputProps) {
  return (
    <input
      inputMode="decimal"
      className={`${inputClass(error)} text-end text-lg font-semibold ${className}`}
      {...rest}
    />
  );
}
