"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { AlertTriangle, Download, FileText, Loader2, Pencil, RotateCcw, ScanSearch, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApplianceContributionList } from "@/components/behavioral/ApplianceContributionList";
import { ContributionCard } from "@/components/behavioral/ContributionCard";
import { EstimatedAnalysisBadge } from "@/components/behavioral/EstimatedAnalysisBadge";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { UploadBillCard } from "@/components/dashboard/UploadBillCard";
import { useAuth } from "@/components/providers/AuthProvider";
import { SeasonalApplianceList } from "@/components/seasonal/SeasonalApplianceList";
import { SeasonalInsightCard } from "@/components/seasonal/SeasonalInsightCard";
import { SeasonalSeasonCard } from "@/components/seasonal/SeasonalSeasonCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppliances } from "@/lib/hooks/useAppliances";
import type { BehavioralEstimation } from "@/lib/hooks/useBehavioralEstimation";
import { sortBillsChronologically, sortBillsReverseChronologically } from "@/lib/bill-chronology";
import { useProfile } from "@/lib/hooks/useProfile";

const apiBaseUrl = "/api/backend";
const EnergyPieChart = dynamic(
  () => import("@/components/charts/EnergyPieChart").then((mod) => mod.EnergyPieChart),
  {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-xl bg-white/5" />,
  }
);

const billMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const fieldSections = [
  {
    title: "Core bill fields",
    fields: [
      { id: "bill-month", key: "bill_month", label: "Bill month", type: "text", formKey: "billMonth", placeholder: "Mar 2026" },
      { id: "billing-days", key: "billing_days", label: "Billing days", type: "number", formKey: "billingDays" },
      { id: "units-consumed", key: "units_consumed", label: "Units consumed", type: "number", formKey: "unitsConsumed" },
      { id: "bill-amount", key: "bill_amount", label: "Bill amount", type: "number", formKey: "billAmount" },
      { id: "net-bill-amount", key: "net_bill_amount", label: "Net bill amount", type: "number", formKey: "netBillAmount" },
      { id: "meter-reading", key: "meter_reading", label: "Meter reading", type: "number", formKey: "meterReading" },
      { id: "tariff-details", key: "tariff_details", label: "Tariff details", type: "text", formKey: "tariffDetails" },
      { id: "subsidy", key: "subsidy", label: "Subsidy", type: "number", formKey: "subsidy" }
    ]
  },
  {
    title: "Telangana advanced fields",
    fields: [
      { id: "average-month-units", key: "average_month_units", label: "Average month units", type: "number", formKey: "averageMonthUnits" },
      { id: "recorded-md", key: "recorded_md", label: "Recorded MD", type: "number", formKey: "recordedMd" },
      { id: "energy-charges", key: "energy_charges", label: "Energy charges", type: "number", formKey: "energyCharges" },
      { id: "fixed-charges", key: "fixed_charges", label: "Fixed charges", type: "number", formKey: "fixedCharges" },
      { id: "electricity-duty", key: "electricity_duty", label: "Electricity duty", type: "number", formKey: "electricityDuty" },
      { id: "interest-ed", key: "interest_on_ed", label: "Interest on ED", type: "number", formKey: "interestOnEd" },
      { id: "surcharge", key: "surcharge", label: "Surcharge", type: "number", formKey: "surcharge" },
      { id: "adjustment", key: "adjustment", label: "Adjustment", type: "number", formKey: "adjustment" },
      { id: "interest-cd", key: "interest_on_cd", label: "Interest on CD", type: "number", formKey: "interestOnCd" },
      { id: "loss-gain", key: "loss_gain", label: "Loss/Gain", type: "number", formKey: "lossGain" },
      { id: "gjs-subsidy", key: "gjs_subsidy", label: "GJS subsidy", type: "number", formKey: "gjsSubsidy" }
    ]
  }
] as const;

type BillHistoryItem = {
  id: string;
  bill_month: string;
  units_consumed: number | null;
  bill_amount: number | null;
  billing_days?: number | null;
  season?: string | null;
  uploaded_file_url: string | null;
  created_at: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
  is_deleted?: boolean;
  verification_status?: string | null;
  corrected_data?: Record<string, unknown> | null;
  seasonal_metadata?: Record<string, unknown> | null;
  estimated_contribution_results?: Array<{
    category: string;
    estimated_percentage: number;
    estimated_reason: string;
    color?: string;
  }> | null;
  behavioral_assumptions?: string[] | null;
};

type FieldMeta = {
  value: string | number | null;
  confidence: number;
  source: string;
  matched_on: string | null;
  raw_line: string | null;
  requires_review: boolean;
};

type ParseResponse = {
  parsed: Record<string, unknown>;
  corrected: Record<string, unknown>;
  confidence: Record<string, number>;
  uncertain_fields: string[];
  errors: Record<string, string>;
  field_meta: Record<string, FieldMeta>;
  parser_version: string;
  manual_override_fields: string[];
  requires_verification: boolean;
};

type SeasonalPreview = {
  season: string;
  season_card: {
    title: string;
    subtitle: string;
    description: string;
  };
  behavior: {
    household_intensity_per_room: number;
    daily_average_units: number;
    behavior_signals: string[];
    priority_appliances: Array<{
      appliance_name: string;
      quantity: number;
      season_weight: number;
      season_reason: string;
    }>;
    seasonal_assumptions: string[];
  };
  trends: {
    current_season: string;
    current_units: number;
    current_amount: number;
    month_over_month_change: number | null;
    seasonal_average_units: number;
    seasonal_average_amount: number;
    seasonal_history_count: number;
  };
  insights: Array<{
    title: string;
    message: string;
    tone: string;
  }>;
};

const initialFormState = {
  billMonth: "",
  billingDays: "",
  unitsConsumed: "",
  meterReading: "",
  averageMonthUnits: "",
  recordedMd: "",
  energyCharges: "",
  fixedCharges: "",
  electricityDuty: "",
  interestOnEd: "",
  surcharge: "",
  adjustment: "",
  interestOnCd: "",
  lossGain: "",
  billAmount: "",
  subsidy: "",
  gjsSubsidy: "",
  netBillAmount: "",
  tariffDetails: ""
};

function buildBillMonthOptions(totalMonths = 36) {
  const options: string[] = [];
  const now = new Date();
  const startMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  for (let index = 0; index < totalMonths; index += 1) {
    const optionDate = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() - index, 1));
    options.push(billMonthFormatter.format(optionDate));
  }

  return options;
}

function normalizeBillMonth(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.clone().json()) as { detail?: string };
    if (payload.detail) {
      return payload.detail;
    }
  } catch {
    // Fall through to text handling.
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

function buildFormStateFromBill(corrected: Record<string, unknown> | null | undefined) {
  return {
    billMonth: String(corrected?.bill_month ?? ""),
    billingDays: corrected?.billing_days != null ? String(corrected.billing_days) : "",
    unitsConsumed: corrected?.units_consumed != null ? String(corrected.units_consumed) : "",
    meterReading: corrected?.meter_reading != null ? String(corrected.meter_reading) : "",
    averageMonthUnits: corrected?.average_month_units != null ? String(corrected.average_month_units) : "",
    recordedMd: corrected?.recorded_md != null ? String(corrected.recorded_md) : "",
    energyCharges: corrected?.energy_charges != null ? String(corrected.energy_charges) : "",
    fixedCharges: corrected?.fixed_charges != null ? String(corrected.fixed_charges) : "",
    electricityDuty: corrected?.electricity_duty != null ? String(corrected.electricity_duty) : "",
    interestOnEd: corrected?.interest_on_ed != null ? String(corrected.interest_on_ed) : "",
    surcharge: corrected?.surcharge != null ? String(corrected.surcharge) : "",
    adjustment: corrected?.adjustment != null ? String(corrected.adjustment) : "",
    interestOnCd: corrected?.interest_on_cd != null ? String(corrected.interest_on_cd) : "",
    lossGain: corrected?.loss_gain != null ? String(corrected.loss_gain) : "",
    billAmount: corrected?.bill_amount != null ? String(corrected.bill_amount) : "",
    subsidy: corrected?.subsidy != null ? String(corrected.subsidy) : "",
    gjsSubsidy: corrected?.gjs_subsidy != null ? String(corrected.gjs_subsidy) : "",
    netBillAmount: corrected?.net_bill_amount != null ? String(corrected.net_bill_amount) : "",
    tariffDetails: String(corrected?.tariff_details ?? ""),
  };
}

function manualFieldsFromCorrected(corrected: Record<string, unknown>) {
  return {
    bill_month: (corrected.bill_month as string) ?? null,
    billing_days: corrected.billing_days != null ? Number(corrected.billing_days) : null,
    units_consumed: corrected.units_consumed != null ? Number(corrected.units_consumed) : null,
    meter_reading: corrected.meter_reading != null ? Number(corrected.meter_reading) : null,
    average_month_units: corrected.average_month_units != null ? Number(corrected.average_month_units) : null,
    recorded_md: corrected.recorded_md != null ? Number(corrected.recorded_md) : null,
    energy_charges: corrected.energy_charges != null ? Number(corrected.energy_charges) : null,
    fixed_charges: corrected.fixed_charges != null ? Number(corrected.fixed_charges) : null,
    electricity_duty: corrected.electricity_duty != null ? Number(corrected.electricity_duty) : null,
    interest_on_ed: corrected.interest_on_ed != null ? Number(corrected.interest_on_ed) : null,
    surcharge: corrected.surcharge != null ? Number(corrected.surcharge) : null,
    adjustment: corrected.adjustment != null ? Number(corrected.adjustment) : null,
    interest_on_cd: corrected.interest_on_cd != null ? Number(corrected.interest_on_cd) : null,
    loss_gain: corrected.loss_gain != null ? Number(corrected.loss_gain) : null,
    bill_amount: corrected.bill_amount != null ? Number(corrected.bill_amount) : null,
    subsidy: corrected.subsidy != null ? Number(corrected.subsidy) : null,
    gjs_subsidy: corrected.gjs_subsidy != null ? Number(corrected.gjs_subsidy) : null,
    net_bill_amount: corrected.net_bill_amount != null ? Number(corrected.net_bill_amount) : null,
    tariff_details: (corrected.tariff_details as string) ?? null
  };
}

function createManualSignature(manualFields: Record<string, unknown>) {
  return JSON.stringify(manualFields);
}

export default function BillsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { profile } = useProfile();
  const { appliances } = useAppliances();
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [permanentlyDeleting, setPermanentlyDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [history, setHistory] = useState<BillHistoryItem[]>([]);
  const [deletedHistory, setDeletedHistory] = useState<BillHistoryItem[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillHistoryItem | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BillHistoryItem | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<BillHistoryItem | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [ocrText, setOcrText] = useState("");
  const [ocrFileUrl, setOcrFileUrl] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const [confidenceMap, setConfidenceMap] = useState<Record<string, number>>({});
  const [fieldMeta, setFieldMeta] = useState<Record<string, FieldMeta>>({});
  const [uncertainFields, setUncertainFields] = useState<string[]>([]);
  const [manualOverrideFields, setManualOverrideFields] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [parserVersion, setParserVersion] = useState<string | null>(null);
  const [formState, setFormState] = useState(initialFormState);
  const [lastParsedManualSignature, setLastParsedManualSignature] = useState<string | null>(null);
  const [autoReviewing, setAutoReviewing] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [seasonalPreview, setSeasonalPreview] = useState<SeasonalPreview | null>(null);
  const [seasonalPreviewLoading, setSeasonalPreviewLoading] = useState(false);
  const [seasonalPreviewError, setSeasonalPreviewError] = useState<string | null>(null);
  const [behavioralPreview, setBehavioralPreview] = useState<BehavioralEstimation | null>(null);
  const [behavioralPreviewLoading, setBehavioralPreviewLoading] = useState(false);
  const [behavioralPreviewError, setBehavioralPreviewError] = useState<string | null>(null);
  const [handledRouteAction, setHandledRouteAction] = useState<string | null>(null);
  const billRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasOcrAssist = Boolean(ocrText.trim() || ocrFileUrl || ocrConfidence !== null || Object.keys(fieldMeta).length > 0);
  const previewHistory = sortBillsChronologically(
    editingBillId ? history.filter((bill) => bill.id !== editingBillId) : history
  );
  const requestedBillId = searchParams.get("bill");
  const requestedMode = searchParams.get("mode") ?? "view";
  const billMonthOptions = useMemo(() => {
    const options = buildBillMonthOptions();
    const currentValue = formState.billMonth.trim();
    if (currentValue && !options.includes(currentValue)) {
      return [currentValue, ...options];
    }
    return options;
  }, [formState.billMonth]);
  const duplicateMonthBill = useMemo(() => {
    const normalizedMonth = normalizeBillMonth(formState.billMonth);
    if (!normalizedMonth) return null;
    return history.find(
      (bill) => bill.id !== editingBillId && normalizeBillMonth(bill.bill_month) === normalizedMonth,
    ) ?? null;
  }, [editingBillId, formState.billMonth, history]);

  const fetchHistory = useCallback(async () => {
    if (!session?.access_token) {
      setHistory([]);
      setDeletedHistory([]);
      setSelectedBill(null);
      setHistoryLoading(false);
      return;
    }

    setHistoryLoading(true);
    setError(null);

    try {
      const [activeResponse, deletedResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/bills`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${apiBaseUrl}/api/bills?include_deleted=true`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      if (!activeResponse.ok) {
        setError(await readErrorMessage(activeResponse, "Failed to load bills."));
        setHistoryLoading(false);
        return;
      }

      if (!deletedResponse.ok) {
        setError(await readErrorMessage(deletedResponse, "Failed to load deleted bills."));
        setHistoryLoading(false);
        return;
      }

      const activeBills = sortBillsReverseChronologically(await readBillHistoryData(activeResponse)).filter((bill) => !bill.is_deleted);
      const deletedBills = sortBillsReverseChronologically((await readBillHistoryData(deletedResponse)).filter((bill) => bill.is_deleted));
      setHistory(activeBills);
      setDeletedHistory(deletedBills);
      setSelectedBill((current) => current ? activeBills.find((item) => item.id === current.id) ?? activeBills[0] ?? null : activeBills[0] ?? null);
    } catch {
      setError(`Cannot reach the backend API at ${apiBaseUrl}. Check that FastAPI is running and CORS allows this frontend origin.`);
    } finally {
      setHistoryLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!duplicateMonthBill) {
      setValidationErrors((current) => {
        if (!current.bill_month) {
          return current;
        }

        const next = { ...current };
        delete next.bill_month;
        return next;
      });
      return;
    }

    setValidationErrors((current) => ({
      ...current,
      bill_month: `A bill for ${duplicateMonthBill.bill_month} already exists. Open that record from Bill History if you want to update it.`,
    }));
  }, [duplicateMonthBill]);

  const parseOptionalNumber = (value: string) => {
    if (!value.trim()) return null;
    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? null : numericValue;
  };

  const applyCorrectedToForm = (corrected: Record<string, unknown>) => {
    setFormState((prev) => ({
      ...prev,
      billMonth: (corrected.bill_month as string) ?? prev.billMonth,
      billingDays: corrected.billing_days !== undefined ? String(corrected.billing_days) : prev.billingDays,
      unitsConsumed: corrected.units_consumed !== undefined ? String(corrected.units_consumed) : prev.unitsConsumed,
      meterReading: corrected.meter_reading !== undefined ? String(corrected.meter_reading) : prev.meterReading,
      averageMonthUnits: corrected.average_month_units !== undefined ? String(corrected.average_month_units) : prev.averageMonthUnits,
      recordedMd: corrected.recorded_md !== undefined ? String(corrected.recorded_md) : prev.recordedMd,
      energyCharges: corrected.energy_charges !== undefined ? String(corrected.energy_charges) : prev.energyCharges,
      fixedCharges: corrected.fixed_charges !== undefined ? String(corrected.fixed_charges) : prev.fixedCharges,
      electricityDuty: corrected.electricity_duty !== undefined ? String(corrected.electricity_duty) : prev.electricityDuty,
      interestOnEd: corrected.interest_on_ed !== undefined ? String(corrected.interest_on_ed) : prev.interestOnEd,
      surcharge: corrected.surcharge !== undefined ? String(corrected.surcharge) : prev.surcharge,
      adjustment: corrected.adjustment !== undefined ? String(corrected.adjustment) : prev.adjustment,
      interestOnCd: corrected.interest_on_cd !== undefined ? String(corrected.interest_on_cd) : prev.interestOnCd,
      lossGain: corrected.loss_gain !== undefined ? String(corrected.loss_gain) : prev.lossGain,
      billAmount: corrected.bill_amount !== undefined ? String(corrected.bill_amount) : prev.billAmount,
      subsidy: corrected.subsidy !== undefined ? String(corrected.subsidy) : prev.subsidy,
      gjsSubsidy: corrected.gjs_subsidy !== undefined ? String(corrected.gjs_subsidy) : prev.gjsSubsidy,
      netBillAmount: corrected.net_bill_amount !== undefined ? String(corrected.net_bill_amount) : prev.netBillAmount,
      tariffDetails: (corrected.tariff_details as string) ?? prev.tariffDetails
    }));
  };

  const buildManualFields = useCallback(() => ({
    bill_month: formState.billMonth.trim() || null,
    billing_days: parseOptionalNumber(formState.billingDays),
    units_consumed: parseOptionalNumber(formState.unitsConsumed),
    meter_reading: parseOptionalNumber(formState.meterReading),
    average_month_units: parseOptionalNumber(formState.averageMonthUnits),
    recorded_md: parseOptionalNumber(formState.recordedMd),
    energy_charges: parseOptionalNumber(formState.energyCharges),
    fixed_charges: parseOptionalNumber(formState.fixedCharges),
    electricity_duty: parseOptionalNumber(formState.electricityDuty),
    interest_on_ed: parseOptionalNumber(formState.interestOnEd),
    surcharge: parseOptionalNumber(formState.surcharge),
    adjustment: parseOptionalNumber(formState.adjustment),
    interest_on_cd: parseOptionalNumber(formState.interestOnCd),
    loss_gain: parseOptionalNumber(formState.lossGain),
    bill_amount: parseOptionalNumber(formState.billAmount),
    subsidy: parseOptionalNumber(formState.subsidy),
    gjs_subsidy: parseOptionalNumber(formState.gjsSubsidy),
    net_bill_amount: parseOptionalNumber(formState.netBillAmount),
    tariff_details: formState.tariffDetails.trim() || null
  }), [formState]);

  const resetWorkspace = useCallback(() => {
    setEditingBillId(null);
    setFormState(initialFormState);
    setOcrText("");
    setOcrFileUrl(null);
    setOcrConfidence(null);
    setParsedData(null);
    setConfidenceMap({});
    setFieldMeta({});
    setUncertainFields([]);
    setManualOverrideFields([]);
    setValidationErrors({});
    setParserVersion(null);
    setLastParsedManualSignature(null);
    setShowAudit(false);
    setSeasonalPreview(null);
    setSeasonalPreviewError(null);
    setBehavioralPreview(null);
    setBehavioralPreviewError(null);
    setError(null);
  }, []);

  const openBillInline = useCallback((bill: BillHistoryItem | null) => {
    setSelectedBill((current) => current?.id === bill?.id ? null : bill);

    if (!bill) {
      return;
    }

    window.setTimeout(() => {
      billRowRefs.current[bill.id]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  }, []);

  const beginEditingBill = useCallback((bill: BillHistoryItem) => {
    setEditingBillId(bill.id);
    setSelectedBill(bill);
    setFormState(buildFormStateFromBill(bill.corrected_data));
    setOcrText("");
    setOcrFileUrl(bill.uploaded_file_url);
    setOcrConfidence(null);
    setParsedData(bill.corrected_data ?? null);
    setConfidenceMap({});
    setFieldMeta({});
    setUncertainFields([]);
    setManualOverrideFields([]);
    setValidationErrors({});
    setParserVersion(null);
    setLastParsedManualSignature(createManualSignature(manualFieldsFromCorrected(bill.corrected_data ?? {})));
    setShowAudit(false);
    setSuccess(`Editing ${bill.bill_month}. Update the values below, then save changes.`);
    setError(null);
  }, []);

  useEffect(() => {
    if (!requestedBillId || historyLoading) {
      return;
    }

    const actionSignature = `${requestedBillId}:${requestedMode}`;
    if (handledRouteAction === actionSignature) {
      return;
    }

    const activeBill = history.find((item) => item.id === requestedBillId);
    const deletedBill = deletedHistory.find((item) => item.id === requestedBillId);

    if (requestedMode === "permanent-delete" && deletedBill) {
      setPermanentDeleteTarget(deletedBill);
      setHandledRouteAction(actionSignature);
      router.replace("/bills");
      return;
    }

    if (!activeBill) {
      setHandledRouteAction(actionSignature);
      router.replace("/bills");
      return;
    }

    openBillInline(activeBill);

    if (requestedMode === "edit") {
      beginEditingBill(activeBill);
    } else if (requestedMode === "delete") {
      setDeleteTarget(activeBill);
    }

    setHandledRouteAction(actionSignature);
    router.replace("/bills");
  }, [beginEditingBill, deletedHistory, handledRouteAction, history, historyLoading, openBillInline, requestedBillId, requestedMode, router]);

  const currentPreviewBill = useMemo(() => {
    const manualFields = buildManualFields();
    return {
      bill_month: manualFields.bill_month,
      billing_days: manualFields.billing_days,
      units_consumed: manualFields.units_consumed,
      bill_amount: manualFields.bill_amount,
    };
  }, [buildManualFields]);

  const parseOcrText = useCallback(async (manualOverride = false, silent = false) => {
    if (!ocrText.trim()) {
      setError("Upload a bill first to parse OCR.");
      return null;
    }
    if (!session?.access_token) {
      setError("Please sign in to parse OCR data.");
      return null;
    }

    setParsing(true);
    if (!silent) {
      setError(null);
    }

    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl}/api/bills/parse`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ocr_text: ocrText,
          manual_fields: manualOverride ? buildManualFields() : null,
          ocr_confidence: ocrConfidence
        })
      });
    } catch {
      setParsing(false);
      setAutoReviewing(false);
      setError(`Cannot reach the backend API at ${apiBaseUrl}. Check that FastAPI is running and CORS allows this frontend origin.`);
      return null;
    }

    setParsing(false);
    setAutoReviewing(false);

    if (!response.ok) {
      setError(await readErrorMessage(response, "Failed to parse OCR text."));
      return null;
    }

    const data = (await response.json()) as ParseResponse;
    setParsedData(data.parsed);
    setConfidenceMap(data.confidence ?? {});
    setFieldMeta(data.field_meta ?? {});
    setUncertainFields(data.uncertain_fields ?? []);
    setValidationErrors(data.errors ?? {});
    setManualOverrideFields(data.manual_override_fields ?? []);
    setParserVersion(data.parser_version ?? null);
    applyCorrectedToForm(data.corrected ?? {});
    setLastParsedManualSignature(createManualSignature(manualFieldsFromCorrected(data.corrected ?? {})));
    return data;
  }, [buildManualFields, ocrConfidence, ocrText, session?.access_token]);

  useEffect(() => {
    if (!ocrText.trim() || !session?.access_token || parsing || saving) {
      return;
    }

    const currentSignature = createManualSignature(buildManualFields());
    if (currentSignature === lastParsedManualSignature) {
      return;
    }

    const timer = window.setTimeout(() => {
      setAutoReviewing(true);
      void parseOcrText(true, true);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [buildManualFields, formState, lastParsedManualSignature, ocrText, parseOcrText, parsing, saving, session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !profile || !currentPreviewBill.bill_month || currentPreviewBill.units_consumed == null || currentPreviewBill.bill_amount == null) {
      setSeasonalPreview(null);
      setSeasonalPreviewError(null);
      setSeasonalPreviewLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSeasonalPreviewLoading(true);
      setSeasonalPreviewError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/seasonal/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            household: profile,
            appliances,
            current_bill: currentPreviewBill,
            history: previewHistory.map((bill) => ({
              bill_month: bill.bill_month,
              units_consumed: bill.units_consumed,
              bill_amount: bill.bill_amount
            }))
          })
        });

        if (!response.ok) {
          setSeasonalPreview(null);
          setSeasonalPreviewError("Seasonal preview is waiting for cleaner bill inputs.");
          setSeasonalPreviewLoading(false);
          return;
        }

        const result = (await response.json()) as SeasonalPreview;
        setSeasonalPreview(result);
        setSeasonalPreviewLoading(false);
      } catch {
        setSeasonalPreview(null);
        setSeasonalPreviewError("Seasonal preview is temporarily unavailable.");
        setSeasonalPreviewLoading(false);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [appliances, currentPreviewBill, previewHistory, profile, session?.access_token]);

  useEffect(() => {
    if (!session?.access_token || !profile || !currentPreviewBill.bill_month || currentPreviewBill.units_consumed == null || currentPreviewBill.bill_amount == null) {
      setBehavioralPreview(null);
      setBehavioralPreviewError(null);
      setBehavioralPreviewLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setBehavioralPreviewLoading(true);
      setBehavioralPreviewError(null);

      try {
        const response = await fetch(`${apiBaseUrl}/api/behavioral/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            household: profile,
            appliances,
            current_bill: currentPreviewBill,
            history: previewHistory.map((bill) => ({
              bill_month: bill.bill_month,
              units_consumed: bill.units_consumed,
              bill_amount: bill.bill_amount,
              billing_days: null
            })),
            seasonal_assumptions: seasonalPreview?.behavior.seasonal_assumptions ?? []
          })
        });

        if (!response.ok) {
          setBehavioralPreview(null);
          setBehavioralPreviewError("Estimated contribution preview is waiting for cleaner bill inputs.");
          setBehavioralPreviewLoading(false);
          return;
        }

        const result = (await response.json()) as BehavioralEstimation;
        setBehavioralPreview(result);
        setBehavioralPreviewLoading(false);
      } catch {
        setBehavioralPreview(null);
        setBehavioralPreviewError("Estimated contribution preview is temporarily unavailable.");
        setBehavioralPreviewLoading(false);
      }
    }, 650);

    return () => window.clearTimeout(timer);
  }, [appliances, currentPreviewBill, previewHistory, profile, seasonalPreview?.behavior.seasonal_assumptions, session?.access_token]);

  const handleManualSave = async () => {
    if (!session?.access_token) {
      setError("Please sign in to save a bill.");
      return;
    }

    if (duplicateMonthBill) {
      setError("Choose a different bill month or edit the existing saved bill from Bill History.");
      setValidationErrors((current) => ({
        ...current,
        bill_month: `A bill for ${duplicateMonthBill.bill_month} already exists. Open that record from Bill History if you want to update it.`,
      }));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    let response: Response;
    try {
      response = await fetch(editingBillId ? `${apiBaseUrl}/api/bills/${editingBillId}` : `${apiBaseUrl}/api/bills/save`, {
        method: editingBillId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ocr_text: ocrText,
          manual_fields: buildManualFields(),
          file_url: ocrFileUrl,
          ocr_confidence: ocrConfidence,
          bill_id: editingBillId ?? undefined,
        })
      });
    } catch {
      setSaving(false);
      setError(`Cannot reach the backend API at ${apiBaseUrl}. Check that FastAPI is running and CORS allows this frontend origin.`);
      return;
    }

    setSaving(false);

    if (!response.ok) {
      setError(await readErrorMessage(response, "Failed to save bill."));
      return;
    }

    const data = (await response.json()) as {
      id: string;
      verification_status: string;
      parsed_data: Record<string, unknown>;
      corrected_data: Record<string, unknown>;
      uncertain_fields: string[];
      errors: Record<string, string>;
      manual_override_fields: string[];
    };

    setParsedData(data.parsed_data ?? {});
    applyCorrectedToForm(data.corrected_data ?? {});
    setUncertainFields(data.uncertain_fields ?? []);
    setValidationErrors(data.errors ?? {});
    setManualOverrideFields(data.manual_override_fields ?? []);
    setLastParsedManualSignature(createManualSignature(manualFieldsFromCorrected(data.corrected_data ?? {})));
    setSuccess(
      data.verification_status === "verified"
        ? `Saved and verified ${String(data.corrected_data.bill_month ?? "bill")}. Seasonal intelligence is now available in Dashboard, Analytics, and Recommendations.`
        : `Saved ${String(data.corrected_data.bill_month ?? "bill")} for manual review. Seasonal context will still appear, but it is based on estimated bill interpretation.`
    );

    await fetchHistory();
    setEditingBillId(data.id);
    setSelectedBill((current) => current?.id === data.id ? {
      ...current,
      id: data.id,
      bill_month: String(data.corrected_data.bill_month ?? formState.billMonth),
      units_consumed: Number(data.corrected_data.units_consumed ?? parseOptionalNumber(formState.unitsConsumed)),
      bill_amount: Number(data.corrected_data.bill_amount ?? parseOptionalNumber(formState.billAmount)),
      billing_days: Number(data.corrected_data.billing_days ?? parseOptionalNumber(formState.billingDays)),
      season: seasonalPreview?.season ?? current?.season ?? null,
      uploaded_file_url: ocrFileUrl,
      verification_status: data.verification_status,
      corrected_data: data.corrected_data ?? {},
      seasonal_metadata: { season: seasonalPreview?.season ?? current?.season ?? null },
      estimated_contribution_results: behavioralPreview?.category_contributions ?? current?.estimated_contribution_results ?? [],
      behavioral_assumptions: behavioralPreview?.behavior_assumptions ?? current?.behavioral_assumptions ?? []
    } : current);

    if (editingBillId) {
      setSuccess(`Updated ${String(data.corrected_data.bill_month ?? "bill")} successfully.`);
      return;
    }

    window.setTimeout(() => {
      router.push(`/analytics?bill=${data.id}`);
    }, 700);
  };

  const handleDeleteBill = async () => {
    if (!deleteTarget || !session?.access_token) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/bills/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "Failed to delete bill."));
        setDeleting(false);
        return;
      }

      setSuccess("Bill deleted successfully");
      setDeleteTarget(null);
      if (editingBillId === deleteTarget.id) {
        resetWorkspace();
      }
      await fetchHistory();
    } catch {
      setError(`Cannot reach the backend API at ${apiBaseUrl}. Check that FastAPI is running and CORS allows this frontend origin.`);
    } finally {
      setDeleting(false);
    }
  };

  const handleRestoreBill = async (bill: BillHistoryItem) => {
    if (!session?.access_token) {
      return;
    }

    setRestoring(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/bills/${bill.id}/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "Failed to restore bill."));
        setRestoring(false);
        return;
      }

      setSuccess("Bill restored successfully");
      await fetchHistory();
    } catch {
      setError(`Cannot reach the backend API at ${apiBaseUrl}. Check that FastAPI is running and CORS allows this frontend origin.`);
    } finally {
      setRestoring(false);
    }
  };

  const handlePermanentDeleteBill = async () => {
    if (!permanentDeleteTarget || !session?.access_token) {
      return;
    }

    setPermanentlyDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/bills/${permanentDeleteTarget.id}/permanent`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        setError(await readErrorMessage(response, "Failed to permanently delete bill."));
        setPermanentlyDeleting(false);
        return;
      }

      setSuccess("Bill permanently deleted");
      setPermanentDeleteTarget(null);
      await fetchHistory();
    } catch {
      setError(`Cannot reach the backend API at ${apiBaseUrl}. Check that FastAPI is running and CORS allows this frontend origin.`);
    } finally {
      setPermanentlyDeleting(false);
    }
  };

  const isUncertain = (field: string) => uncertainFields.includes(field);
  const fieldError = (field: string) => validationErrors[field];
  const getFieldMeta = (field: string) => fieldMeta[field];
  const getSavedContributionBreakdown = (bill: BillHistoryItem) =>
    (bill.estimated_contribution_results ?? []).map((item) => ({
      ...item,
      estimated_amount:
        bill.bill_amount != null
          ? (Number(bill.bill_amount) * item.estimated_percentage) / 100
          : null,
    }));

  const renderLabel = (id: string, label: string, field: string) => {
    const meta = getFieldMeta(field);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {meta ? (
          <Badge variant={meta.source === "manual" ? "success" : meta.requires_review ? "warning" : "info"}>
            {meta.source}
          </Badge>
        ) : null}
        {isUncertain(field) ? (
          <span className="text-xs text-amber-400">Needs review</span>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Bills & invoices"
        description="Enter the bill manually or upload a bill image to prefill the form. Save once the values look right."
        actionLabel="Manual first"
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="order-2 space-y-6">
          {!editingBillId ? (
            <Card className="rise-in">
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Upload bill for OCR prefill</div>
                    <div className="mt-1 text-xs text-muted">
                      Optional. WattWise can read the bill and prefill the form, but manual review still decides the final values.
                    </div>
                  </div>
                  <Badge variant="info">Optional</Badge>
                </div>

                <UploadBillCard
                  showPreview={false}
                  onOcrComplete={async (payload) => {
                    setOcrText(payload.text);
                    setOcrFileUrl(payload.fileUrl || null);
                    setOcrConfidence(payload.ocrConfidence ?? null);
                    setError(null);
                    await parseOcrText();
                  }}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card className="rise-in" style={{ animationDelay: "80ms" }}>
            <CardContent className="space-y-4 pt-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Bill history and saved records</div>
                  <div className="mt-1 text-xs leading-5 text-muted">
                    Review older bills, restore deleted records, or permanently remove mistakes from the dedicated history workspace.
                  </div>
                </div>
                <Button type="button" variant="outline" asChild>
                  <Link href="/bill-history">Open bill history</Link>
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-background px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Saved bills</div>
                  <div className="mt-3 text-2xl font-semibold text-foreground">
                    {historyLoading ? "--" : history.length}
                  </div>
                  <div className="mt-1 text-xs text-muted">Available in history</div>
                </div>
                <div className="rounded-2xl border border-border bg-background px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Recently deleted</div>
                  <div className="mt-3 text-2xl font-semibold text-foreground">
                    {historyLoading ? "--" : deletedHistory.length}
                  </div>
                  <div className="mt-1 text-xs text-muted">Hidden from analytics</div>
                </div>
                <div className="rounded-2xl border border-border bg-background px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted">Workspace mode</div>
                  <div className="mt-3 text-2xl font-semibold text-foreground">
                    {editingBillId ? "Editing" : "New bill"}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {editingBillId ? "Updating a saved record" : "Ready for a fresh entry"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="order-1 rise-in" style={{ animationDelay: "120ms" }}>
          <CardContent className="pt-6">
            <div className="space-y-5">
              {selectedBill && editingBillId ? (
                <div className="rounded-2xl border border-border bg-background p-5">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-base font-semibold text-foreground">{selectedBill.bill_month}</div>
                      <div className="text-xs text-muted">You are editing this saved record from Bill History. Save here to refresh its analysis snapshot.</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedBill.season ? <Badge variant="info">{selectedBill.season}</Badge> : null}
                      <Badge variant={selectedBill.verification_status === "verified" ? "success" : "warning"}>
                        {selectedBill.verification_status === "verified" ? "Verified" : "Needs review"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-6 grid gap-6 border-t border-border pt-6 xl:grid-cols-[0.95fr,1.05fr] xl:items-start">
              <div className="order-2 space-y-4 xl:order-1">
                <div>
                  <div className="text-sm font-semibold text-foreground">Saved bill history</div>
                  <div className="text-xs text-muted">
                    Select any bill to inspect the saved values and analysis. The selected bill opens in the panel above on mobile and beside the list on larger screens.
                  </div>
                </div>

                {historyLoading ? <div className="text-sm text-muted">Loading bill history...</div> : null}
                {!historyLoading && history.length === 0 ? (
                  <div className="text-sm text-muted">No bills saved yet. Upload or add a manual entry.</div>
                ) : null}
                {history.map((bill) => (
                  <div
                    key={bill.id}
                    className="space-y-3"
                    ref={(node) => {
                      billRowRefs.current[bill.id] = node;
                    }}
                  >
                  <div
                    className={`flex cursor-pointer flex-col gap-4 rounded-2xl border px-4 py-4 transition-colors md:flex-row md:items-center md:justify-between ${
                      selectedBill?.id === bill.id
                        ? "border-primary/40 bg-primary/5"
                        : "border-border bg-background hover:bg-white/5"
                    }`}
                    onClick={() => openBillInline(bill)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{bill.bill_month}</div>
                        <div className="text-xs text-muted">
                          {bill.units_consumed ? `${bill.units_consumed} kWh` : "--"}
                        </div>
                        <div className="text-[11px] text-muted">
                          {bill.season ?? "Season pending"}{bill.created_at ? ` · Uploaded ${new Date(bill.created_at).toLocaleDateString()}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-4">
                      <div className="text-sm font-semibold">
                        {bill.bill_amount ? `INR ${bill.bill_amount}` : "--"}
                      </div>
                      <Badge variant={bill.verification_status === "verified" ? "success" : "warning"}>
                        {bill.verification_status === "verified" ? "Verified" : "Needs review"}
                      </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              openBillInline(bill);
                            }}
                          >
                            {selectedBill?.id === bill.id ? "Hide" : "View"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          beginEditingBill(bill);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(bill);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                      {bill.uploaded_file_url ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={bill.uploaded_file_url} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" />
                            File
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {selectedBill?.id === bill.id ? (
                    <div className="dropdown-reveal mt-3 origin-top space-y-4 rounded-2xl border border-primary/20 bg-background p-5">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-base font-semibold text-foreground">{bill.bill_month}</div>
                          <div className="text-xs text-muted">Saved values, estimated analysis, and bill context for this record.</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {bill.season ? <Badge variant="info">{bill.season}</Badge> : null}
                          <Badge variant={bill.verification_status === "verified" ? "success" : "warning"}>
                            {bill.verification_status === "verified" ? "Verified" : "Needs review"}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-border px-4 py-3">
                          <div className="text-xs text-muted">Units consumed</div>
                          <div className="mt-2 text-lg font-semibold text-foreground">{bill.units_consumed ?? "--"} kWh</div>
                        </div>
                        <div className="rounded-xl border border-border px-4 py-3">
                          <div className="text-xs text-muted">Bill amount</div>
                          <div className="mt-2 text-lg font-semibold text-foreground">{bill.bill_amount != null ? `INR ${bill.bill_amount}` : "--"}</div>
                        </div>
                        <div className="rounded-xl border border-border px-4 py-3">
                          <div className="text-xs text-muted">Billing days</div>
                          <div className="mt-2 text-lg font-semibold text-foreground">{bill.billing_days ?? "--"}</div>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3">
                          <div className="text-sm font-semibold text-foreground">Saved bill values</div>
                          <div className="rounded-xl border border-border px-4 py-3 text-sm text-muted">
                            {bill.corrected_data ? (
                              <div className="grid gap-2">
                                {Object.entries(bill.corrected_data)
                                  .filter(([, value]) => value !== null && value !== "")
                                  .slice(0, 8)
                                  .map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between gap-3">
                                      <span className="text-muted">{key}</span>
                                      <span className="text-right text-foreground">{String(value)}</span>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <span>No corrected bill snapshot stored for this item yet.</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="text-sm font-semibold text-foreground">Saved estimated analysis</div>
                          <div className="rounded-xl border border-border px-4 py-3 text-sm text-muted">
                            {(bill.estimated_contribution_results ?? []).length > 0 ? (
                              <div className="space-y-3">
                                {getSavedContributionBreakdown(bill).map((item) => (
                                  <div key={item.category} className="rounded-xl border border-border bg-background px-3 py-3">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3">
                                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color ?? "#10B981" }} />
                                        <span className="font-medium text-foreground">{item.category}</span>
                                      </div>
                                      <div className="text-right">
                                        <div className="font-semibold text-foreground">
                                          {item.estimated_amount != null ? `INR ${Math.round(item.estimated_amount)}` : "--"}
                                        </div>
                                        <div className="text-[11px] text-muted">{item.estimated_percentage}%</div>
                                      </div>
                                    </div>
                                    <div className="mt-2 text-xs text-muted">{item.estimated_reason}</div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span>No saved estimated contribution snapshot is available for this bill yet.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {bill.behavioral_assumptions && bill.behavioral_assumptions.length > 0 ? (
                        <div className="space-y-3">
                          <div className="text-sm font-semibold text-foreground">Behavioral assumptions used</div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {bill.behavioral_assumptions.slice(0, 4).map((item) => (
                              <div key={item} className="rounded-xl border border-border px-4 py-3 text-sm text-muted">
                                {item}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  </div>
                ))}
              </div>

              <div className="hidden">
                {selectedBill ? (
                  <div className="space-y-4 rounded-2xl border border-border bg-background p-5 xl:sticky xl:top-6">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-base font-semibold text-foreground">{selectedBill.bill_month}</div>
                        <div className="text-xs text-muted">Review the saved values, estimated analysis, and bill context for this record.</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedBill.season ? <Badge variant="info">{selectedBill.season}</Badge> : null}
                        <Badge variant={selectedBill.verification_status === "verified" ? "success" : "warning"}>
                          {selectedBill.verification_status === "verified" ? "Verified" : "Needs review"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-border px-4 py-3">
                        <div className="text-xs text-muted">Units consumed</div>
                        <div className="mt-2 text-lg font-semibold text-foreground">{selectedBill.units_consumed ?? "--"} kWh</div>
                      </div>
                      <div className="rounded-xl border border-border px-4 py-3">
                        <div className="text-xs text-muted">Bill amount</div>
                        <div className="mt-2 text-lg font-semibold text-foreground">{selectedBill.bill_amount != null ? `INR ${selectedBill.bill_amount}` : "--"}</div>
                      </div>
                      <div className="rounded-xl border border-border px-4 py-3">
                        <div className="text-xs text-muted">Billing days</div>
                        <div className="mt-2 text-lg font-semibold text-foreground">{selectedBill.billing_days ?? "--"}</div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-foreground">Saved bill values</div>
                        <div className="rounded-xl border border-border px-4 py-3 text-sm text-muted">
                          {selectedBill.corrected_data ? (
                            <div className="grid gap-2">
                              {Object.entries(selectedBill.corrected_data)
                                .filter(([, value]) => value !== null && value !== "")
                                .slice(0, 10)
                                .map(([key, value]) => (
                                  <div key={key} className="flex items-center justify-between gap-3">
                                    <span className="text-muted">{key}</span>
                                    <span className="text-right text-foreground">{String(value)}</span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <span>No corrected bill snapshot stored for this item yet.</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-foreground">Saved estimated analysis</div>
                        <div className="rounded-xl border border-border px-4 py-3 text-sm text-muted">
                          {getSavedContributionBreakdown(selectedBill).length > 0 ? (
                            <div className="space-y-3">
                              {getSavedContributionBreakdown(selectedBill).map((item) => (
                                <div key={item.category} className="rounded-xl border border-border bg-background px-3 py-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color ?? "#10B981" }} />
                                      <span className="font-medium text-foreground">{item.category}</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold text-foreground">
                                        {item.estimated_amount != null ? `INR ${Math.round(item.estimated_amount)}` : "--"}
                                      </div>
                                      <div className="text-[11px] text-muted">{item.estimated_percentage}%</div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-xs text-muted">{item.estimated_reason}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span>No saved estimated contribution snapshot is available for this bill yet.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedBill.behavioral_assumptions && selectedBill.behavioral_assumptions.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-foreground">Behavioral assumptions used</div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {selectedBill.behavioral_assumptions.slice(0, 4).map((item) => (
                            <div key={item} className="rounded-xl border border-border px-4 py-3 text-sm text-muted">
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                      <Button type="button" size="sm" variant="outline" onClick={() => beginEditingBill(selectedBill)}>
                        <Pencil className="h-4 w-4" />
                        Edit bill
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setDeleteTarget(selectedBill)}>
                        <Trash2 className="h-4 w-4" />
                        Delete bill
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-background p-5 text-sm text-muted">
                    Select a saved bill to see its stored values and analysis here.
                  </div>
                )}
              </div>
            </div>

            <div className="hidden">
              <div>
                <div className="text-sm font-semibold text-foreground">Recently deleted bills</div>
                <div className="text-xs text-muted">
                  Deleted bills are removed from analytics, seasonal intelligence, and behavioral estimation until they are restored.
                </div>
              </div>

              {deletedHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-4 text-sm text-muted">
                  No deleted bills right now.
                </div>
              ) : (
                <div className="grid gap-3">
                  {deletedHistory.map((bill) => (
                    <div key={bill.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-background px-4 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{bill.bill_month}</div>
                        <div className="text-xs text-muted">
                          {bill.units_consumed ?? "--"} kWh | {bill.bill_amount != null ? `INR ${bill.bill_amount}` : "--"}
                        </div>
                        <div className="text-[11px] text-muted">
                          {bill.deleted_at ? `Deleted ${new Date(bill.deleted_at).toLocaleDateString()}` : "Recently deleted"}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="warning">Deleted</Badge>
                        <Button type="button" size="sm" variant="outline" onClick={() => handleRestoreBill(bill)} disabled={restoring}>
                          {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                          Restore
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setPermanentDeleteTarget(bill)}
                          disabled={permanentlyDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete permanently
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{editingBillId ? "Edit saved bill" : "Bill entry workspace"}</div>
                  <div className="text-xs text-muted">
                    {editingBillId
                      ? "Update the saved values below. After saving, WattWise refreshes the bill context from the corrected record."
                      : "Manual values drive the final seasonal analysis. OCR is optional and only assists with prefilling."}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingBillId ? (
                    <Button type="button" size="sm" variant="outline" onClick={resetWorkspace}>
                      <X className="h-4 w-4" />
                      Cancel edit
                    </Button>
                  ) : null}
                  {hasOcrAssist ? (
                    <Button size="sm" variant="outline" onClick={() => parseOcrText(true)} disabled={!ocrText.trim() || parsing}>
                      {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                      Re-read OCR
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={handleManualSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {editingBillId ? "Save updates" : "Save"}
                  </Button>
                </div>
              </div>

              {error ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div>
              ) : null}
              {success ? (
                <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">{success}</div>
              ) : null}

              {hasOcrAssist ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background px-3 py-3 text-xs text-muted">
                    OCR confidence: {ocrConfidence !== null ? `${Math.round(ocrConfidence * 100)}%` : "Not available"}
                  </div>
                  <div className="rounded-xl border border-border bg-background px-3 py-3 text-xs text-muted">
                    Parser version: {parserVersion ?? "Awaiting parse"}
                  </div>
                </div>
              ) : null}

              {ocrText.trim() ? (
                <div className="rounded-xl border border-border bg-background px-3 py-3 text-xs text-muted">
                  {autoReviewing || parsing
                    ? "Manual corrections are being re-checked automatically."
                    : "Seasonal intelligence will use the corrected values shown here. Save the bill to push this analysis into Dashboard, Analytics, and Recommendations."}
                </div>
              ) : null}

              {!hasOcrAssist ? (
                <div className="rounded-xl border border-border bg-background px-3 py-3 text-xs text-muted">
                  Seasonal intelligence will work from the manual values you enter here. OCR is optional and not required.
                </div>
              ) : null}

              {uncertainFields.length > 0 ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-100">
                  <div className="flex items-center gap-2 font-medium text-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    Verification required
                  </div>
                  <div className="mt-2 text-amber-100">Fields needing review: {uncertainFields.join(", ")}</div>
                </div>
              ) : null}

              {hasOcrAssist ? (
                <div className="space-y-2">
                  <Label htmlFor="ocr-raw">OCR raw text</Label>
                  <Textarea
                    id="ocr-raw"
                    value={ocrText}
                    onChange={(event) => setOcrText(event.target.value)}
                    placeholder="Paste or edit OCR text here..."
                  />
                </div>
              ) : null}

              {fieldSections.map((section) => (
                <div key={section.title} className="space-y-4">
                  <div className="text-sm font-semibold">{section.title}</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {section.fields.map((field) => {
                      const value = formState[field.formKey];
                      const meta = getFieldMeta(field.key);
                      return (
                        <div key={field.id} className={field.key === "tariff_details" ? "space-y-2 md:col-span-2" : "space-y-2"}>
                          {renderLabel(field.id, field.label, field.key)}
                          {field.key === "bill_month" ? (
                            <select
                              id={field.id}
                              value={value}
                              onChange={(event) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  [field.formKey]: event.target.value,
                                }))
                              }
                              className="flex h-10 w-full rounded-lg border border-border bg-transparent px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60"
                            >
                              <option value="">Select bill month</option>
                              {billMonthOptions.map((option) => (
                                <option key={option} value={option} className="bg-[#111827] text-foreground">
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              id={field.id}
                              type={field.type === "number" ? "number" : "text"}
                              inputMode={field.type === "number" ? "decimal" : undefined}
                              placeholder={"placeholder" in field && typeof field.placeholder === "string" ? field.placeholder : undefined}
                              value={value}
                              onChange={(event) =>
                                setFormState((prev) => ({
                                  ...prev,
                                  [field.formKey]: event.target.value
                                }))
                              }
                            />
                          )}
                          {meta ? (
                            <div className="text-[11px] text-muted">
                              Source: {meta.source} | Confidence: {Math.round((confidenceMap[field.key] ?? meta.confidence) * 100)}%
                              {manualOverrideFields.includes(field.key) ? " | Manual override pending save" : ""}
                            </div>
                          ) : null}
                          {field.key === "bill_month" && duplicateMonthBill ? (
                            <div className="text-[11px] text-amber-300">
                              {duplicateMonthBill.bill_month} is already saved. Open that record from Bill History if you want to update it.
                            </div>
                          ) : null}
                          {fieldError(field.key) ? (
                            <div className="text-xs text-red-400">{fieldError(field.key)}</div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="text-sm font-semibold text-foreground">Recommended workflow</div>
                <div className="mt-2 text-xs text-muted">
                  Enter bill month, units consumed, bill amount, and billing days manually for the most reliable seasonal analysis.
                  Use OCR only if you want help pre-filling the form, then review and correct the values below.
                </div>
              </div>

              {Object.keys(fieldMeta).length > 0 ? (
                <div className="space-y-3 rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Need help reviewing OCR?</div>
                      <div className="text-xs text-muted">
                        Most users only need the editable bill fields above. Open the audit only if you want to inspect OCR extraction details.
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAudit((current) => !current)}
                    >
                      {showAudit ? "Hide audit" : "Show audit"}
                    </Button>
                  </div>

                  {showAudit ? (
                    <div className="grid gap-3">
                      {Object.entries(fieldMeta).map(([field, meta]) => (
                        <div key={field} className="rounded-xl border border-border px-3 py-3 text-xs text-muted">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-foreground">{field}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant={meta.source === "manual" ? "success" : meta.requires_review ? "warning" : "info"}>
                                {meta.source}
                              </Badge>
                              <span>{Math.round(meta.confidence * 100)}%</span>
                            </div>
                          </div>
                          <div className="mt-2">Value: {String(meta.value ?? "--")}</div>
                          {meta.raw_line ? <div className="mt-1">Raw line: {meta.raw_line}</div> : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold">Seasonal intelligence preview</div>
                    <div className="text-xs text-muted">
                      This is a pre-save preview only. It helps the user see how WattWise will interpret the bill before it becomes part of saved analytics.
                    </div>
                  </div>
                  <Badge variant="info">Pre-save preview</Badge>
                </div>

                {!profile ? (
                  <div className="text-xs text-muted">Complete household settings to unlock a richer seasonal preview.</div>
                ) : null}

                {seasonalPreviewLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Building seasonal preview...
                  </div>
                ) : null}

                {!seasonalPreviewLoading && seasonalPreviewError ? (
                  <div className="text-xs text-muted">{seasonalPreviewError}</div>
                ) : null}

                {!seasonalPreviewLoading && !seasonalPreview && !seasonalPreviewError ? (
                  <div className="text-xs text-muted">
                    Add at least bill month, bill amount, and units consumed to generate a seasonal preview before saving.
                  </div>
                ) : null}

                {uncertainFields.length > 0 ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs text-amber-100">
                    This preview is only as reliable as the values above. Review uncertain OCR-derived fields carefully, or replace them with manual values for better analysis quality.
                  </div>
                ) : null}

                {seasonalPreview ? (
                  <div className="space-y-4">
                    <SeasonalSeasonCard
                      season={seasonalPreview.season}
                      title={seasonalPreview.season_card.title}
                      description={seasonalPreview.season_card.description}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      {seasonalPreview.insights.map((item) => (
                        <SeasonalInsightCard
                          key={item.title}
                          title={item.title}
                          message={item.message}
                          tone={item.tone}
                        />
                      ))}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Usage indicators</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted">
                          {seasonalPreview.behavior.behavior_signals.length > 0 ? (
                            seasonalPreview.behavior.behavior_signals.map((signal) => (
                              <div key={signal} className="rounded-xl border border-border bg-background px-3 py-3">
                                {signal}
                              </div>
                            ))
                          ) : (
                            <div className="rounded-xl border border-border bg-background px-3 py-3">
                              Add appliance and household context to deepen behavior signals.
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Preview summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm text-muted">
                          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3">
                            <span>Detected season</span>
                            <span className="text-foreground">{seasonalPreview.season}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3">
                            <span>Daily average</span>
                            <span className="text-foreground">{seasonalPreview.behavior.daily_average_units || "--"}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3">
                            <span>Comparable seasonal bills</span>
                            <span className="text-foreground">{seasonalPreview.trends.seasonal_history_count}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <SeasonalApplianceList items={seasonalPreview.behavior.priority_appliances} />
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold">Estimated contribution preview</div>
                    <div className="text-xs text-muted">
                      This preview shows probable appliance-category contribution before save. After saving, the user is redirected to Analytics for the full breakdown.
                    </div>
                  </div>
                  <EstimatedAnalysisBadge label={behavioralPreview?.estimated_analysis_label} />
                </div>

                {behavioralPreviewLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Building estimated contribution preview...
                  </div>
                ) : null}

                {!behavioralPreviewLoading && behavioralPreviewError ? (
                  <div className="text-xs text-muted">{behavioralPreviewError}</div>
                ) : null}

                {!behavioralPreviewLoading && !behavioralPreview && !behavioralPreviewError ? (
                  <div className="text-xs text-muted">
                    Add at least bill month, bill amount, and units consumed to preview estimated appliance contribution.
                  </div>
                ) : null}

                {behavioralPreview ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      {behavioralPreview.category_contributions.slice(0, 3).map((item) => (
                        <ContributionCard
                          key={item.category}
                          title={item.category}
                          percentage={item.estimated_percentage}
                          detail={item.estimated_reason}
                        />
                      ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[0.95fr,1.05fr]">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">Estimated category mix</CardTitle>
                            <p className="text-sm text-muted">
                              Estimated Analysis only. These values are inferred from household and seasonal context, not exact metering.
                            </p>
                          </div>
                          <EstimatedAnalysisBadge />
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-[0.9fr,1.1fr]">
                          <EnergyPieChart
                            data={behavioralPreview.category_contributions.map((item) => ({
                              name: item.category,
                              value: item.estimated_percentage,
                              color: item.color,
                            }))}
                          />
                          <div className="space-y-3">
                            {behavioralPreview.category_contributions.map((item) => (
                              <div key={item.category} className="rounded-xl border border-border bg-background px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-sm font-semibold text-foreground">{item.category}</span>
                                  </div>
                                  <span className="text-sm font-semibold text-foreground">{item.estimated_percentage}%</span>
                                </div>
                                <div className="mt-2 text-xs text-muted">{item.estimated_reason}</div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <ApplianceContributionList items={behavioralPreview.appliance_contributions} />
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md border-red-500/20">
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <div className="text-lg font-semibold text-foreground">Delete this bill?</div>
                <p className="text-sm text-muted">
                  This action can affect analytics and predictions. The bill will be soft-deleted and moved to Recently Deleted, where you can restore it later.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
                <div className="font-medium text-foreground">{deleteTarget.bill_month}</div>
                <div>{deleteTarget.units_consumed ?? "--"} kWh · {deleteTarget.bill_amount != null ? `INR ${deleteTarget.bill_amount}` : "--"}</div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleDeleteBill} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {permanentDeleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md border-red-500/20">
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <div className="text-lg font-semibold text-foreground">Delete this bill permanently?</div>
                <p className="text-sm text-muted">
                  This action cannot be undone. The bill will be removed completely instead of staying in Recently Deleted.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted">
                <div className="font-medium text-foreground">{permanentDeleteTarget.bill_month}</div>
                <div>{permanentDeleteTarget.units_consumed ?? "--"} kWh · {permanentDeleteTarget.bill_amount != null ? `INR ${permanentDeleteTarget.bill_amount}` : "--"}</div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPermanentDeleteTarget(null)} disabled={permanentlyDeleting}>
                  Cancel
                </Button>
                <Button type="button" onClick={handlePermanentDeleteBill} disabled={permanentlyDeleting}>
                  {permanentlyDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete permanently
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

