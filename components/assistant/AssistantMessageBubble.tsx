"use client";

import { Bot, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function AssistantMessageBubble({
  role,
  text,
  category,
  insights,
  references,
  grounding,
}: {
  role: "user" | "assistant";
  text: string;
  category?: string | null;
  insights?: string[];
  references?: string[];
  grounding?: Record<string, unknown> | null;
}) {
  const isAssistant = role === "assistant";
  return (
    <div className={`flex gap-3 ${isAssistant ? "items-start" : "items-start justify-end"}`}>
      {isAssistant ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Bot className="h-5 w-5" />
        </div>
      ) : null}
      <div className={`max-w-3xl space-y-3 rounded-3xl border px-4 py-4 shadow-[0_16px_36px_rgba(0,0,0,0.2)] ${
        isAssistant
          ? "border-white/8 bg-[#111827] text-foreground"
          : "border-secondary/30 bg-secondary/12 text-foreground"
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">{isAssistant ? "AI Energy Assistant" : "You"}</div>
          {category && isAssistant ? <Badge variant="info">{category.replaceAll("_", " ")}</Badge> : null}
          {!isAssistant ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/8 text-muted">
              <User className="h-4 w-4" />
            </div>
          ) : null}
        </div>
        <div className="whitespace-pre-line text-sm leading-7 text-muted">{text}</div>
        {isAssistant && grounding ? (
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
            {grounding.season ? <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">{String(grounding.season)}</span> : null}
            {grounding.energy_score ? <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">Score {String(grounding.energy_score)}</span> : null}
            {grounding.lead_category ? <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1">{String(grounding.lead_category)}</span> : null}
          </div>
        ) : null}
        {isAssistant && insights && insights.length ? (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-muted">Grounded insights</div>
            <div className="space-y-2">
              {insights.slice(0, 3).map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-muted">
                  {item}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {isAssistant && references && references.length ? (
          <div className="flex flex-wrap gap-2">
            {references.slice(0, 3).map((item) => (
              <Badge key={item} variant="success">{item}</Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
