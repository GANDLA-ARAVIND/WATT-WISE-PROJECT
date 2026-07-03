export type BillChronologyRecord = {
  bill_month?: string | null;
  created_at?: string | null;
};

const monthMap: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export function getBillChronologyTime(value: BillChronologyRecord) {
  const raw = value.bill_month?.trim();
  if (raw) {
    const textMatch = raw.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b(?:\s+|-|\/)?(20\d{2})?/i);
    if (textMatch) {
      const month = monthMap[textMatch[1].toLowerCase()];
      const year = Number(textMatch[2] ?? new Date().getUTCFullYear());
      return Date.UTC(year, month, 1);
    }

    const numericMatch = raw.match(/^(\d{1,2})[\/ -](20\d{2})$/);
    if (numericMatch) {
      return Date.UTC(Number(numericMatch[2]), Number(numericMatch[1]) - 1, 1);
    }
  }

  const createdAt = value.created_at ? Date.parse(value.created_at) : Number.NaN;
  return Number.isNaN(createdAt) ? 0 : createdAt;
}

export function sortBillsChronologically<T extends BillChronologyRecord>(bills: T[]) {
  return [...bills].sort((left, right) => getBillChronologyTime(left) - getBillChronologyTime(right));
}

export function sortBillsReverseChronologically<T extends BillChronologyRecord>(bills: T[]) {
  return [...bills].sort((left, right) => getBillChronologyTime(right) - getBillChronologyTime(left));
}
