"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";

export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  family_members: number | null;
  room_count: number | null;
  house_type: string | null;
  monthly_budget_goal: number | null;
  onboarding_completed_at: string | null;
  onboarding_skipped_at: string | null;
};

const profileSelect =
  "id,name,email,city,state,family_members,room_count,house_type,monthly_budget_goal,onboarding_completed_at,onboarding_skipped_at";
const fallbackProfileSelect =
  "id,name,email,city,state,family_members,room_count,house_type,monthly_budget_goal";

function isSchemaCacheColumnError(message: string | undefined) {
  return Boolean(
    message?.includes("schema cache") &&
      (message.includes("onboarding_completed_at") || message.includes("onboarding_skipped_at")),
  );
}

function localOnboardingSkipKey(userId: string) {
  return `wattwise:onboarding-skipped:${userId}`;
}

function getLocalOnboardingSkippedAt(userId: string) {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(localOnboardingSkipKey(userId));
}

function setLocalOnboardingSkippedAt(userId: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localOnboardingSkipKey(userId), value);
}

function withClientOnboardingState(profile: Omit<UserProfile, "onboarding_completed_at" | "onboarding_skipped_at">): UserProfile {
  return {
    ...profile,
    onboarding_completed_at: null,
    onboarding_skipped_at: getLocalOnboardingSkippedAt(profile.id),
  };
}

type ProfileCache = {
  userId: string;
  profile: UserProfile | null;
  hasOnboardingColumns: boolean;
};

let profileCache: ProfileCache | null = null;
let profileFetchPromise: Promise<ProfileCache> | null = null;
const profileListeners = new Set<(cache: ProfileCache | null) => void>();

function updateProfileCache(cache: ProfileCache | null) {
  profileCache = cache;
  profileListeners.forEach((listener) => listener(cache));
}

export function useProfile() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { user } = useAuth();
  const cachedProfile = user && profileCache?.userId === user.id ? profileCache : null;
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile?.profile ?? null);
  const [loading, setLoading] = useState(!cachedProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOnboardingColumns, setHasOnboardingColumns] = useState(cachedProfile?.hasOnboardingColumns ?? true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const listener = (cache: ProfileCache | null) => {
      if (!cache || cache.userId !== user.id) return;
      setProfile(cache.profile);
      setHasOnboardingColumns(cache.hasOnboardingColumns);
      setLoading(false);
    };

    profileListeners.add(listener);
    return () => {
      profileListeners.delete(listener);
    };
  }, [user]);

  const refresh = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!user) {
      updateProfileCache(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    if (!force && profileCache?.userId === user.id) {
      setProfile(profileCache.profile);
      setHasOnboardingColumns(profileCache.hasOnboardingColumns);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const emptyProfile = (): UserProfile => ({
        id: user.id,
        email: user.email ?? null,
        name: (user.user_metadata?.name as string) ?? null,
        city: null,
        state: null,
        family_members: null,
        room_count: null,
        house_type: null,
        monthly_budget_goal: null,
        onboarding_completed_at: null,
        onboarding_skipped_at: getLocalOnboardingSkippedAt(user.id),
    });

    const fetchProfile = async (): Promise<ProfileCache> => {
      const { data, error: fetchError } = await supabase
        .from("users")
        .select(profileSelect)
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) {
        if (isSchemaCacheColumnError(fetchError.message)) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("users")
            .select(fallbackProfileSelect)
            .eq("id", user.id)
            .maybeSingle();

          if (fallbackError) {
            throw fallbackError;
          }

          return {
            userId: user.id,
            profile: fallbackData ? withClientOnboardingState(fallbackData) : emptyProfile(),
            hasOnboardingColumns: false,
          };
        }

        throw fetchError;
      }

      return {
        userId: user.id,
        profile: data
          ? {
              ...data,
              onboarding_skipped_at: data.onboarding_skipped_at ?? getLocalOnboardingSkippedAt(user.id),
            }
          : emptyProfile(),
        hasOnboardingColumns: true,
      };
    };

    try {
      if (!profileFetchPromise) {
        profileFetchPromise = fetchProfile().finally(() => {
          profileFetchPromise = null;
        });
      }

      const nextCache = await profileFetchPromise;
      updateProfileCache(nextCache);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Profile could not be loaded.");
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user) {
        const message = "You must be signed in to update your profile.";
        setError(message);
        return { error: message };
      }

      setSaving(true);
      setError(null);

      const nextSkippedAt = updates.onboarding_skipped_at ?? profile?.onboarding_skipped_at ?? null;
      if (updates.onboarding_skipped_at) {
        setLocalOnboardingSkippedAt(user.id, updates.onboarding_skipped_at);
      }

      const payload: UserProfile = {
        id: user.id,
        email: user.email ?? updates.email ?? profile?.email ?? null,
        name: updates.name ?? profile?.name ?? null,
        city: updates.city ?? profile?.city ?? null,
        state: updates.state ?? profile?.state ?? null,
        family_members: updates.family_members ?? profile?.family_members ?? null,
        room_count: updates.room_count ?? profile?.room_count ?? null,
        house_type: updates.house_type ?? profile?.house_type ?? null,
        monthly_budget_goal: updates.monthly_budget_goal ?? profile?.monthly_budget_goal ?? null,
        onboarding_completed_at: updates.onboarding_completed_at ?? profile?.onboarding_completed_at ?? null,
        onboarding_skipped_at: nextSkippedAt,
      };

      const fallbackPayload = {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        city: payload.city,
        state: payload.state,
        family_members: payload.family_members,
        room_count: payload.room_count,
        house_type: payload.house_type,
        monthly_budget_goal: payload.monthly_budget_goal,
      };

      let savedProfile: UserProfile | null = null;
      let saveErrorMessage: string | null = null;

      const fullResult = hasOnboardingColumns
        ? await supabase
            .from("users")
            .upsert(payload, { onConflict: "id" })
            .select(profileSelect)
            .single()
        : null;

      if (fullResult?.error && isSchemaCacheColumnError(fullResult.error.message)) {
        setHasOnboardingColumns(false);
        const fallbackResult = await supabase
          .from("users")
          .upsert(fallbackPayload, { onConflict: "id" })
          .select(fallbackProfileSelect)
          .single();
        if (fallbackResult.error) {
          saveErrorMessage = fallbackResult.error.message;
        } else if (fallbackResult.data) {
          savedProfile = withClientOnboardingState(fallbackResult.data);
        }
      } else if (fullResult?.error) {
        saveErrorMessage = fullResult.error.message;
      } else if (fullResult?.data) {
        savedProfile = {
          ...(fullResult.data as UserProfile),
          onboarding_skipped_at:
            (fullResult.data as UserProfile).onboarding_skipped_at ?? getLocalOnboardingSkippedAt(user.id),
        };
      } else {
        const fallbackResult = await supabase
          .from("users")
          .upsert(fallbackPayload, { onConflict: "id" })
          .select(fallbackProfileSelect)
          .single();
        if (fallbackResult.error) {
          saveErrorMessage = fallbackResult.error.message;
        } else if (fallbackResult.data) {
          savedProfile = withClientOnboardingState(fallbackResult.data);
        }
      }

      if (saveErrorMessage || !savedProfile) {
        const message = saveErrorMessage ?? "Profile could not be saved.";
        setError(message);
        setSaving(false);
        return { error: message };
      }

      updateProfileCache({
        userId: user.id,
        profile: savedProfile,
        hasOnboardingColumns,
      });
      setProfile(savedProfile);
      setSaving(false);
      return { error: null };
    },
    [hasOnboardingColumns, profile, supabase, user]
  );

  return { profile, loading, saving, error, refresh, saveProfile };
}
