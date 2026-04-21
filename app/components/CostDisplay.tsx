"use client";

import { formatTHB, tokensToTHB } from "@/lib/pricing";

interface CostDisplayProps {
  inputTokens: number;
  outputTokens: number;
  model?: string | null;
  showTokens?: boolean;
  compact?: boolean;
  className?: string;
}

export default function CostDisplay({ inputTokens, outputTokens, model, showTokens = true, compact = false, className = "" }: CostDisplayProps) {
  const thb = tokensToTHB(inputTokens, outputTokens, model);
  const totalTokens = inputTokens + outputTokens;

  if (compact) {
    return (
      <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
        {thb !== null && (
          <span className="font-semibold" style={{ color: "var(--accent)" }}>{formatTHB(thb)}</span>
        )}
        {showTokens && (
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {thb !== null ? `· ${totalTokens.toLocaleString()} tokens` : `${totalTokens.toLocaleString()} tokens`}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {thb !== null ? (
        <>
          <span className="text-base font-semibold" style={{ color: "var(--accent)" }}>{formatTHB(thb)}</span>
          {showTokens && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {totalTokens.toLocaleString()} tokens ({inputTokens.toLocaleString()} พิมพ์ · {outputTokens.toLocaleString()} ตอบ)
            </span>
          )}
        </>
      ) : (
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {totalTokens.toLocaleString()} tokens
        </span>
      )}
    </div>
  );
}
