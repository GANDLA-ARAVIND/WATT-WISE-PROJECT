"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/AuthProvider";
import { applianceCatalog } from "@/lib/household";

export type ApplianceRecord = {
  id: string;
  user_id: string;
  appliance_name: string;
  quantity: number;
  created_at?: string | null;
};

export type ApplianceRecordInput = {
  appliance_name: string;
  quantity: number;
  recommended_max: number;
};

const applianceSelect = "id,user_id,appliance_name,quantity,created_at";

type ApplianceCache = {
  userId: string;
  appliances: ApplianceRecord[];
};

let applianceCache: ApplianceCache | null = null;
let applianceFetchPromise: Promise<ApplianceCache> | null = null;
let applianceFetchPromiseUserId: string | null = null;
const applianceListeners = new Set<(cache: ApplianceCache | null) => void>();

function updateApplianceCache(cache: ApplianceCache | null) {
  applianceCache = cache;
  applianceListeners.forEach((listener) => listener(cache));
}

export function useAppliances() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const { user } = useAuth();
  const cachedAppliances = user && applianceCache?.userId === user.id ? applianceCache : null;
  const [appliances, setAppliances] = useState<ApplianceRecord[]>(cachedAppliances?.appliances ?? []);
  const [loading, setLoading] = useState(!cachedAppliances);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }

    const listener = (cache: ApplianceCache | null) => {
      if (!cache || cache.userId !== user.id) return;
      setAppliances(cache.appliances);
      setLoading(false);
    };

    applianceListeners.add(listener);
    return () => {
      applianceListeners.delete(listener);
    };
  }, [user]);

  const refresh = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    if (!user) {
      updateApplianceCache(null);
      setAppliances([]);
      setLoading(false);
      return;
    }

    if (!force && applianceCache?.userId === user.id) {
      setAppliances(applianceCache.appliances);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchAppliances = async (): Promise<ApplianceCache> => {
      const { data, error: fetchError } = await supabase
        .from("appliances")
        .select(applianceSelect)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      return {
        userId: user.id,
        appliances: data ?? [],
      };
    };

    try {
      if (!applianceFetchPromise || applianceFetchPromiseUserId !== user.id) {
        applianceFetchPromiseUserId = user.id;
        applianceFetchPromise = fetchAppliances().finally(() => {
          applianceFetchPromise = null;
          applianceFetchPromiseUserId = null;
        });
      }

      const nextCache = await applianceFetchPromise;
      updateApplianceCache(nextCache);
      setError(null);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Appliances could not be loaded.");
      setLoading(false);
      return;
    }
  }, [supabase, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveAppliances = useCallback(
    async (items: ApplianceRecordInput[]) => {
      if (!user) {
        const message = "You must be signed in to update appliances.";
        setError(message);
        return { error: message };
      }

      setSaving(true);
      setError(null);

      const payload = items
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          user_id: user.id,
          appliance_name: item.appliance_name,
          quantity: item.quantity
        }));

      const existingNames = new Set(applianceCatalog.map((item) => item.name));
      const existingRows = appliances.filter((item) => existingNames.has(item.appliance_name));

      if (existingRows.length > 0) {
        const { error: deleteError } = await supabase
          .from("appliances")
          .delete()
          .eq("user_id", user.id);

        if (deleteError) {
          setError(deleteError.message);
          setSaving(false);
          return { error: deleteError.message };
        }
      }

      if (payload.length === 0) {
        updateApplianceCache({
          userId: user.id,
          appliances: [],
        });
        setAppliances([]);
        setSaving(false);
        return { error: null };
      }

      const { data, error: saveError } = await supabase
        .from("appliances")
        .insert(payload)
        .select(applianceSelect);

      if (saveError) {
        setError(saveError.message);
        setSaving(false);
        return { error: saveError.message };
      }

      const savedAppliances = data ?? [];
      updateApplianceCache({
        userId: user.id,
        appliances: savedAppliances,
      });
      setAppliances(savedAppliances);
      setSaving(false);
      return { error: null };
    },
    [appliances, supabase, user]
  );

  return { appliances, loading, saving, error, refresh, saveAppliances };
}
