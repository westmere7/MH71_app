"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowser } from "./supabase/client";
import type { Bill, MonthRow, Room, Settings, Tenant, PaymentLog, BackupRow } from "./supabase/types";

export const qk = {
  settings: ["settings"] as const,
  months: ["months"] as const,
  rooms: ["rooms"] as const,
  tenants: ["tenants"] as const,
  bills: (monthId: string | null) => ["bills", monthId] as const,
  logs: (billId: string) => ["logs", billId] as const,
  backups: (monthId: string | null) => ["backups", monthId] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: qk.settings,
    queryFn: async (): Promise<Settings | null> => {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useMonths() {
  return useQuery({
    queryKey: qk.months,
    queryFn: async (): Promise<MonthRow[]> => {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("months")
        .select("*")
        .order("year", { ascending: false })
        .order("month", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBackups(monthId: string | null) {
  return useQuery({
    queryKey: qk.backups(monthId),
    enabled: !!monthId,
    queryFn: async (): Promise<BackupRow[]> => {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("backups")
        .select("*")
        .eq("month_id", monthId as string)
        .order("created_at", { ascending: false });
      if (error) {
        if (/backups/i.test(error.message ?? "")) return []; // migration 0014 not applied yet
        throw error;
      }
      return (data ?? []) as BackupRow[];
    },
  });
}

export function useRooms() {
  return useQuery({
    queryKey: qk.rooms,
    queryFn: async (): Promise<Room[]> => {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("rooms")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** current tenants (move_out_date is null), keyed access via the returned map helper */
export function useCurrentTenants() {
  return useQuery({
    queryKey: qk.tenants,
    queryFn: async (): Promise<Tenant[]> => {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("tenants")
        .select("*")
        .is("move_out_date", null);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** every tenant (incl. moved-out) — used to resolve a bill's tenant photo by id */
export function useAllTenants() {
  return useQuery({
    queryKey: ["tenants", "all"] as const,
    queryFn: async (): Promise<Tenant[]> => {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb.from("tenants").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useBills(monthId: string | null) {
  return useQuery({
    queryKey: qk.bills(monthId),
    enabled: !!monthId,
    queryFn: async (): Promise<Bill[]> => {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("bills")
        .select("*")
        .eq("month_id", monthId as string);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** lightweight: all bills across all months, for long-term aggregates + chart */
export function useAllBills() {
  return useQuery({
    queryKey: ["bills", "all"],
    queryFn: async (): Promise<Bill[]> => {
      const sb = getSupabaseBrowser();
      // select * so it works whether or not amount_paid (migration 0005) exists
      const { data, error } = await sb.from("bills").select("*");
      if (error) throw error;
      return (data ?? []) as Bill[];
    },
  });
}

export function usePaymentLogs(billId: string | null) {
  return useQuery({
    queryKey: billId ? qk.logs(billId) : ["logs", "none"],
    enabled: !!billId,
    queryFn: async (): Promise<PaymentLog[]> => {
      const sb = getSupabaseBrowser();
      const { data, error } = await sb
        .from("payment_logs")
        .select("*")
        .eq("bill_id", billId as string)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Subscribe to realtime changes on bills / months / tenants and invalidate
 * the matching queries so all open devices stay in sync.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  React.useEffect(() => {
    const sb = getSupabaseBrowser();
    let channel: ReturnType<typeof sb.channel> | null = null;
    let cancelled = false;

    (async () => {
      // Realtime "postgres_changes" honors RLS — it must authenticate with the
      // logged-in user's token, otherwise the anon socket sees nothing.
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (session?.access_token) sb.realtime.setAuth(session.access_token);
      if (cancelled) return;

      channel = sb
        .channel("mh71-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "bills" }, () => {
          qc.invalidateQueries({ queryKey: ["bills"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "months" }, () => {
          qc.invalidateQueries({ queryKey: qk.months });
          qc.invalidateQueries({ queryKey: ["bills"] });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "tenants" }, () => {
          qc.invalidateQueries({ queryKey: qk.tenants });
        })
        .subscribe((status) => {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.log("[mh71 realtime]", status);
          }
        });
    })();

    // keep realtime auth fresh after token refresh / re-login
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) sb.realtime.setAuth(session.access_token);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      if (channel) sb.removeChannel(channel);
    };
  }, [qc]);
}
