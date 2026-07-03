"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";

const apiBaseUrl = "/api/backend";

export type AssistantConversation = {
  id: string;
  question: string;
  answer: string;
  assistant_category: string | null;
  generated_insights: string[];
  related_recommendation_refs: string[];
  grounding_metadata: Record<string, unknown> | null;
  created_at: string | null;
};

export type AssistantAskResult = {
  id: string;
  question: string;
  answer: string;
  assistant_category: string;
  generated_insights: string[];
  related_recommendations: string[];
  follow_up_suggestions: string[];
  grounding: Record<string, unknown>;
  created_at: string;
};

export type AssistantSummary = {
  latest_bill_month: string | null;
  latest_units: number | null;
  latest_bill_amount: number | null;
  season: string | null;
  energy_score: string | null;
  lead_category: string | null;
  lead_appliance: string | null;
  next_bill_range: {
    min_amount: number;
    max_amount: number;
    center_amount: number;
  } | null;
  prediction_confidence: {
    level: string;
    reason: string;
  } | null;
  bill_count: number | null;
};

export function useEnergyAssistant() {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [assistantSummary, setAssistantSummary] = useState<AssistantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session?.access_token) {
      setConversations([]);
      setSuggestedQuestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/assistant/conversations`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const text = await response.text();
        setError(text || "Failed to load assistant history.");
        setLoading(false);
        return;
      }

      const result = (await response.json()) as {
        suggested_questions: string[];
        assistant_summary: AssistantSummary | null;
        conversations: AssistantConversation[];
      };
      setConversations(result.conversations ?? []);
      setSuggestedQuestions(result.suggested_questions ?? []);
      setAssistantSummary(result.assistant_summary ?? null);
      setLoading(false);
    } catch {
      setError("Unable to reach the AI energy assistant.");
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ask = useCallback(async (question: string) => {
    if (!session?.access_token) {
      return { error: "You must be signed in to use the assistant.", result: null as AssistantAskResult | null };
    }

    setAsking(true);
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/assistant/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        const detail = await response.text();
        setError(detail || "Failed to ask the assistant.");
        setAsking(false);
        return { error: detail || "Failed to ask the assistant.", result: null as AssistantAskResult | null };
      }

      const result = (await response.json()) as AssistantAskResult;
      setConversations((prev) => [
        ...prev,
        {
          id: result.id,
          question: result.question,
          answer: result.answer,
          assistant_category: result.assistant_category,
          generated_insights: result.generated_insights,
          related_recommendation_refs: result.related_recommendations,
          grounding_metadata: result.grounding,
          created_at: result.created_at,
        },
      ]);
      setSuggestedQuestions(result.follow_up_suggestions.length ? result.follow_up_suggestions : suggestedQuestions);
      setAsking(false);
      return { error: null, result };
    } catch {
      const message = "Unable to reach the AI energy assistant.";
      setError(message);
      setAsking(false);
      return { error: message, result: null as AssistantAskResult | null };
    }
  }, [session?.access_token, suggestedQuestions]);

  const hasHistory = useMemo(() => conversations.length > 0, [conversations.length]);

  return {
    conversations,
    suggestedQuestions,
    assistantSummary,
    loading,
    asking,
    error,
    hasHistory,
    ask,
    refresh,
  };
}
