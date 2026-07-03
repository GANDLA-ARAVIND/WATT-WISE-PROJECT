"use client";

import Link from "next/link";
import { FileText, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/providers/AuthProvider";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { sortBillsReverseChronologically } from "@/lib/bill-chronology";

const apiBaseUrl = "/api/backend";

type BillHistoryItem = {
  id: string;
  bill_month: string;
  units_consumed: number | null;
  bill_amount: number | null;
  season?: string | null;
  created_at: string | null;
  deleted_at?: string | null;
  is_deleted?: boolean;
  verification_status?: string | null;
};

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.clone().json()) as { detail?: string };
    if (payload.detail) {
      return payload.detail;
    }
  } catch {
    // Ignore JSON parsing failures.
  }

  try {
    const text = (await response.text()).trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

async function readBillHistoryData(response: Response) {
  return (await response.json()) as BillHistoryItem[];
}

function HistorySkeletonBlock() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="border-white/8 bg-[#111827]">
          <CardContent className="grid gap-4 pt-6 lg:grid-cols-[1fr,auto] lg:items-center">
            <div className="space-y-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function BillHistoryPage() {
  const router = useRouter();
  const { session } = useAuth();
  const [history, setHistory] = useState<BillHistoryItem[]>([]);
  const [deletedHistory, setDeletedHistory] = useState<BillHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!session?.access_token) {
      setHistory([]);
      setDeletedHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [activeResponse, deletedResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/bills`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }),
        fetch(`${apiBaseUrl}/api/bills?include_deleted=true`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        }),
      ]);

      if (!activeResponse.ok) {
        setError(await readErrorMessage(activeResponse, "Failed to load bill history."));
        setLoading(false);
        return;
      }

      if (!deletedResponse.ok) {
        setError(await readErrorMessage(deletedResponse, "Failed to load deleted bill history."));
        setLoading(false);
        return;
      }

      const activeBills = sortBillsReverseChronologically(await readBillHistoryData(activeResponse)).filter((bill) => !bill.is_deleted);
      const deletedBills = sortBillsReverseChronologically(await readBillHistoryData(deletedResponse)).filter((bill) => bill.is_deleted);
      setHistory(activeBills);
      setDeletedHistory(deletedBills);
      setLoading(false);
    } catch {
      setError("Unable to load bill history right now.");
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const activeCountLabel = useMemo(() => `${history.length} saved bill${history.length === 1 ? "" : "s"}`, [history.length]);
  const deletedCountLabel = useMemo(() => `${deletedHistory.length} deleted bill${deletedHistory.length === 1 ? "" : "s"}`, [deletedHistory.length]);

  const handleRestore = async (billId: string) => {
    if (!session?.access_token) {
      return;
    }

    setRestoringId(billId);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/bills/${billId}/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "Failed to restore bill."));
        setRestoringId(null);
        return;
      }

      setSuccess("Bill restored successfully");
      setRestoringId(null);
      await fetchHistory();
    } catch {
      setError("Unable to restore this bill right now.");
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Bill History"
        description="A dedicated bill-management view for reviewing saved records, reopening edits, and restoring deleted items without disturbing analytics."
        actionLabel="Open bill manager"
        onAction={() => {
          router.push("/bills");
        }}
      />

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
          {success}
        </div>
      ) : null}

      <section className="space-y-4 surface-fade">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-foreground">Saved bills</div>
            <div className="text-sm text-muted">Active bills continue to power dashboard analytics, seasonal intelligence, and behavioral estimation.</div>
          </div>
          <Badge variant="info">{activeCountLabel}</Badge>
        </div>

        {loading ? <HistorySkeletonBlock /> : null}

        {!loading && history.length === 0 ? (
          <Card className="border-white/8 bg-[#111827]">
            <CardContent className="pt-6 text-sm text-muted">
              No saved bills yet. Add your first manual bill entry to start the intelligence pipeline.
            </CardContent>
          </Card>
        ) : null}

        {!loading ? history.map((bill, index) => (
          <Card key={bill.id} className="border-white/8 bg-[#111827] rise-in" style={{ animationDelay: `${index * 50}ms` }}>
            <CardContent className="grid gap-4 pt-6 lg:grid-cols-[1fr,auto] lg:items-center">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-foreground">{bill.bill_month}</div>
                  <div className="text-sm text-muted">
                    {bill.units_consumed ?? "--"} kWh | {bill.bill_amount != null ? `INR ${bill.bill_amount}` : "--"}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{bill.season ?? "Season pending"}</span>
                    <span>Uploaded {bill.created_at ? new Date(bill.created_at).toLocaleDateString() : "--"}</span>
                    <Badge variant={bill.verification_status === "verified" ? "success" : "warning"}>
                      {bill.verification_status === "verified" ? "Verified" : "Needs review"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/bills?bill=${bill.id}`}>View</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/bills?bill=${bill.id}&mode=edit`}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/bills?bill=${bill.id}&mode=delete`}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : null}
      </section>

      <section className="space-y-4 surface-fade">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-foreground">Recently deleted</div>
            <div className="text-sm text-muted">Soft-deleted bills stay recoverable here and remain excluded from dashboard intelligence until restored.</div>
          </div>
          <Badge variant="warning">{deletedCountLabel}</Badge>
        </div>

        {loading ? <HistorySkeletonBlock /> : null}

        {!loading && deletedHistory.length === 0 ? (
          <Card className="border-white/8 bg-[#111827]">
            <CardContent className="pt-6 text-sm text-muted">
              No deleted bills right now.
            </CardContent>
          </Card>
        ) : null}

        {!loading ? deletedHistory.map((bill, index) => (
          <Card key={bill.id} className="border-white/8 bg-[#111827] rise-in" style={{ animationDelay: `${index * 50}ms` }}>
            <CardContent className="grid gap-4 pt-6 lg:grid-cols-[1fr,auto] lg:items-center">
              <div className="space-y-1">
                <div className="text-lg font-semibold text-foreground">{bill.bill_month}</div>
                <div className="text-sm text-muted">
                  {bill.units_consumed ?? "--"} kWh | {bill.bill_amount != null ? `INR ${bill.bill_amount}` : "--"}
                </div>
                <div className="text-xs text-muted">
                  {bill.deleted_at ? `Deleted ${new Date(bill.deleted_at).toLocaleDateString()}` : "Recently deleted"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => handleRestore(bill.id)} disabled={restoringId === bill.id}>
                  {restoringId === bill.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Restore
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/bills?bill=${bill.id}&mode=permanent-delete`}>
                    <Trash2 className="h-4 w-4" />
                    Delete permanently
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : null}
      </section>
    </div>
  );
}
