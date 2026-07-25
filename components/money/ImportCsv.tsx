"use client";

import { useRef, useState } from "react";
import { useData } from "../DataProvider";
import { importTransactionsCsv, type CsvImportResult } from "@/lib/store";
import { btn, cx, Card } from "../ui";

export function ImportCsv({
  onImported,
}: {
  /** Called with the import outcome, e.g. to jump the ledger's month view to
   *  where the imported data landed instead of leaving it on whatever month
   *  happened to be showing. */
  onImported?: (result: CsvImportResult) => void;
}) {
  const { mutate } = useData();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    const text = await file.text();
    let outcome: CsvImportResult = { imported: 0, skipped: 0, latestDate: null };
    mutate((d) => {
      outcome = importTransactionsCsv(d, text);
    });
    setResult(outcome);
    onImported?.(outcome);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(btn.base, btn.outline, "self-start px-3 py-1.5 text-xs")}
      >
        Import transactions (CSV)
      </button>
    );
  }

  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Import transactions
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={cx(btn.base, btn.ghost, "text-xs")}
        >
          Done
        </button>
      </div>
      <p className="text-xs text-text-secondary">
        CSV with Date, Type, Category, Amount, Memo, Wallet columns. Unknown
        wallets and categories are created automatically.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onFile(file);
        }}
        className="text-xs text-text-secondary file:mr-2 file:rounded-md file:border file:border-border file:bg-surface file:px-2 file:py-1 file:text-xs file:text-text-primary"
      />
      {result && (
        <p className="font-mono text-xs text-text-secondary">
          Imported {result.imported}
          {result.skipped > 0 ? ` · skipped ${result.skipped}` : ""}
        </p>
      )}
    </Card>
  );
}
