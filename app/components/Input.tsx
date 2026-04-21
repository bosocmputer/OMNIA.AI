"use client";

import { InputHTMLAttributes, ReactNode, forwardRef, useId, useState } from "react";
import { Eye, EyeOff, HelpCircle } from "lucide-react";
import Tooltip from "./Tooltip";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  tooltip?: ReactNode;
  icon?: ReactNode;
  suffix?: ReactNode;
  wrapperClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, tooltip, icon, suffix, wrapperClassName = "", className = "", type = "text", id, required, ...rest }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === "password";
    const effectiveType = isPassword && showPassword ? "text" : type;

    return (
      <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
        {label && (
          <label htmlFor={inputId} className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            <span>
              {label}
              {required && <span style={{ color: "var(--danger)" }}> *</span>}
            </span>
            {tooltip && (
              <Tooltip content={tooltip}>
                <span className="inline-flex cursor-help" aria-label="คำอธิบาย" style={{ color: "var(--text-muted)" }}>
                  <HelpCircle size={13} />
                </span>
              </Tooltip>
            )}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 inline-flex pointer-events-none" style={{ color: "var(--text-muted)" }}>
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={effectiveType}
            required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            className={`w-full rounded-lg text-sm outline-none transition-colors ${icon ? "pl-9" : "pl-3"} ${isPassword || suffix ? "pr-10" : "pr-3"} py-2.5 ${className}`}
            style={{
              background: "var(--surface)",
              border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
              color: "var(--text)",
              minHeight: 44,
            }}
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 inline-flex items-center justify-center rounded p-1 transition-colors"
              style={{ color: "var(--text-muted)" }}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {!isPassword && suffix && (
            <span className="absolute right-3 inline-flex pointer-events-none text-xs" style={{ color: "var(--text-muted)" }}>
              {suffix}
            </span>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs" style={{ color: "var(--text-muted)" }}>
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";
export default Input;
