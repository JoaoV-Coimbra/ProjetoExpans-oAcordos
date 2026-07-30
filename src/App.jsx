import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  FileSpreadsheet,
  FilterX,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Search,
  Trash2,
  UploadCloud,
  WalletCards,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import "./main.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:3001";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatDate(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatCurrency(value) {
  return typeof value === "number" ? currencyFormatter.format(value) : "-";
}

function isOverdueAgreement(agreement, todayIso) {
  if (agreement.effectiveStatus === "Vencido" || agreement.status === "Vencido") return true;

  return (
    agreement.dueDate &&
    agreement.dueDate < todayIso &&
    agreement.status !== "Cancelado" &&
    agreement.status !== "Recebido" &&
    !agreement.receiptDate
  );
}

function daysBetween(startIso, endIso) {
  if (!startIso || !endIso) return null;

  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const diff = end.getTime() - start.getTime();

  if (!Number.isFinite(diff)) return null;

  return Math.max(0, Math.round(diff / 86400000));
}

function formatDays(value) {
  if (!Number.isFinite(value)) return "-";
  const rounded = Math.round(value);
  return `${rounded} ${rounded === 1 ? "dia" : "dias"}`;
}

function Metric({ label, value }) {
  return (
    <Card className="min-h-[104px] border-white/10 bg-white/[0.04] shadow-none">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-zinc-400">{label}</p>
        <p className="mt-4 break-words text-2xl font-semibold tracking-normal text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({ id, label, icon, children }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-xs font-medium text-zinc-400">
        {label}
      </Label>
      <div className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 text-zinc-400 focus-within:ring-2 focus-within:ring-white/45">
        {icon}
        {children}
      </div>
    </div>
  );
}

function DropdownFilter({ id, label, value, options, onChange }) {
  const ITEM_HEIGHT = 36;
  const LIST_HEIGHT = 288;
  const OVERSCAN = 5;
  const rootRef = useRef(null);
  const scrollRef = useRef(null);
  const frameRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const currentLabel = value || "Todos";
  const allOptions = useMemo(() => ["", ...options], [options]);
  const totalHeight = allOptions.length * ITEM_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(LIST_HEIGHT / ITEM_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(allOptions.length, startIndex + visibleCount);
  const visibleOptions = allOptions.slice(startIndex, endIndex);

  useEffect(() => {
    if (!open) return;

    const selectedIndex = Math.max(0, allOptions.findIndex((option) => option === value));
    const nextScrollTop = Math.max(0, selectedIndex * ITEM_HEIGHT - ITEM_HEIGHT * 2);
    setScrollTop(nextScrollTop);

    window.requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = nextScrollTop;
      }
    });
  }, [allOptions, open, value]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative grid min-w-0 gap-2" ref={rootRef}>
      <Label htmlFor={id} className="text-xs font-medium text-zinc-400">
        {label}
      </Label>
      <button
        id={id}
        className="flex h-10 w-full min-w-0 items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 text-left text-sm text-white outline-none transition hover:bg-white/[0.07] focus:ring-2 focus:ring-white/45"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{currentLabel}</span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 transition-transform duration-150", open ? "rotate-180" : "rotate-0")}
          aria-hidden="true"
        />
      </button>

      <div
        className={cn(
          "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-md border border-white/10 bg-[#111111] shadow-2xl shadow-black/50 transition-[height,opacity,transform] duration-100 ease-out",
          open ? "h-72 translate-y-0 opacity-100" : "pointer-events-none h-0 -translate-y-1 opacity-0"
        )}
      >
        <div
          ref={scrollRef}
          className="h-72 overflow-y-auto"
          onScroll={(event) => {
            const nextScrollTop = event.currentTarget.scrollTop;
            if (frameRef.current) return;
            frameRef.current = window.requestAnimationFrame(() => {
              setScrollTop(nextScrollTop);
              frameRef.current = null;
            });
          }}
        >
          <div className="relative" style={{ height: totalHeight }}>
            {visibleOptions.map((option, offset) => {
              const optionIndex = startIndex + offset;
              const optionLabel = option || "Todos";

              return (
                <button
                  className={cn(
                    "absolute left-0 right-0 flex h-9 w-full items-center px-3 text-left text-sm transition hover:bg-white/10",
                    value === option ? "bg-white/10 text-white" : "text-zinc-300"
                  )}
                  key={`${option || "all"}-${optionIndex}`}
                  style={{ top: optionIndex * ITEM_HEIGHT }}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{optionLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const AgreementRow = React.memo(function AgreementRow({ agreement }) {
  const status = agreement.effectiveStatus || agreement.status;
  const statusClassName =
    status === "Vencido"
      ? "bg-red-500/15 text-red-200"
      : status === "Cancelado"
        ? "bg-zinc-500/15 text-zinc-300"
        : "bg-white/10 text-zinc-200";

  return (
    <TableRow className="border-white/10 hover:bg-white/[0.06]">
      <TableCell className="font-medium text-white">{agreement.agreementId}</TableCell>
      <TableCell className="text-zinc-300">
        {agreement.installment || "-"}
        {agreement.installmentCount ? <span className="text-zinc-500">/{agreement.installmentCount}</span> : null}
        {agreement.parcelId ? <div className="mt-1 text-xs text-zinc-500">ID {agreement.parcelId}</div> : null}
      </TableCell>
      <TableCell className="text-zinc-300">
        {agreement.unit || "-"}
        {agreement.admUnit ? <div className="mt-1 text-xs text-zinc-500">ADM {agreement.admUnit}</div> : null}
      </TableCell>
      <TableCell className="text-zinc-300">
        {agreement.personName || <span className="text-zinc-500">Sem nome</span>}
      </TableCell>
      <TableCell className="text-zinc-300">
        {agreement.condominium || <span className="text-zinc-500">Sem condomínio</span>}
        {agreement.administrator ? (
          <div className="mt-1 max-w-[260px] truncate text-xs text-zinc-500">{agreement.administrator}</div>
        ) : null}
      </TableCell>
      <TableCell className="text-zinc-300">{formatDate(agreement.agreementDate)}</TableCell>
      <TableCell className="text-zinc-300">{formatDate(agreement.dueDate)}</TableCell>
      <TableCell className="text-zinc-300">{formatDate(agreement.receiptDate)}</TableCell>
      <TableCell className="text-zinc-300">{formatCurrency(agreement.value)}</TableCell>
      <TableCell>
        {status ? (
          <Badge variant="secondary" className={statusClassName}>
            {status}
          </Badge>
        ) : (
          <span className="text-zinc-500">-</span>
        )}
        {agreement.correctionStatus ? (
          <div className="mt-1 text-xs text-zinc-500">{agreement.correctionStatus}</div>
        ) : null}
      </TableCell>
    </TableRow>
  );
});

function getSortValue(agreement, key) {
  if (key === "status") return agreement.effectiveStatus || agreement.status || "";
  if (key === "value") return agreement.value || 0;
  if (key === "agreementId" || key === "installment" || key === "unit") {
    const parsed = Number(String(agreement[key] || "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : agreement[key] || "";
  }

  return agreement[key] || "";
}

function SortableHead({ label, sortKey, activeSort, onSort }) {
  const active = activeSort.key === sortKey;
  const Icon = active ? (activeSort.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className="text-zinc-400">
      <button
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-sm text-left transition hover:text-white",
          active ? "text-white" : "text-zinc-400"
        )}
        type="button"
        onClick={() => onSort(sortKey)}
      >
        <span className="truncate">{label}</span>
        <Icon className={cn("size-3.5 shrink-0", active ? "text-white" : "text-zinc-600")} aria-hidden="true" />
      </button>
    </TableHead>
  );
}

const AgreementsTable = React.memo(function AgreementsTable({ agreements }) {
  const ROW_HEIGHT = 72;
  const VIEWPORT_HEIGHT = 640;
  const OVERSCAN = 10;
  const scrollContainerRef = useRef(null);
  const frameRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [sort, setSort] = useState({ key: "", direction: "" });
  const sortedAgreements = useMemo(() => {
    if (!sort.key) return agreements;

    const direction = sort.direction === "asc" ? 1 : -1;

    return [...agreements].sort((a, b) => {
      const aValue = getSortValue(a, sort.key);
      const bValue = getSortValue(b, sort.key);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }

      return String(aValue).localeCompare(String(bValue), "pt-BR", { numeric: true }) * direction;
    });
  }, [agreements, sort]);
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const endIndex = Math.min(sortedAgreements.length, startIndex + visibleCount);
  const visibleAgreements = sortedAgreements.slice(startIndex, endIndex);
  const topSpacer = startIndex * ROW_HEIGHT;
  const bottomSpacer = Math.max(0, (sortedAgreements.length - endIndex) * ROW_HEIGHT);

  function updateSort(key) {
    setSort((current) => {
      if (current.key !== key) {
        return { key, direction: "asc" };
      }

      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }

      return { key: "", direction: "" };
    });
    setScrollTop(0);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }

  return (
    <div
      ref={scrollContainerRef}
      className="max-h-[640px] overflow-auto"
      onScroll={(event) => {
        const nextScrollTop = event.currentTarget.scrollTop;
        if (frameRef.current) return;
        frameRef.current = window.requestAnimationFrame(() => {
          setScrollTop(nextScrollTop);
          frameRef.current = null;
        });
      }}
    >
      <Table className="min-w-[1290px]">
        <TableHeader className="sticky top-0 z-10 bg-[#141414]">
          <TableRow className="border-white/10 bg-white/[0.06] hover:bg-white/[0.06]">
            <SortableHead label="Acordo" sortKey="agreementId" activeSort={sort} onSort={updateSort} />
            <SortableHead label="Parcela" sortKey="installment" activeSort={sort} onSort={updateSort} />
            <SortableHead label="Unidade" sortKey="unit" activeSort={sort} onSort={updateSort} />
            <SortableHead label="Proprietário" sortKey="personName" activeSort={sort} onSort={updateSort} />
            <SortableHead label="Condomínio" sortKey="condominium" activeSort={sort} onSort={updateSort} />
            <SortableHead label="Firmação" sortKey="agreementDate" activeSort={sort} onSort={updateSort} />
            <SortableHead label="Vencimento" sortKey="dueDate" activeSort={sort} onSort={updateSort} />
            <SortableHead label="Recebimento" sortKey="receiptDate" activeSort={sort} onSort={updateSort} />
            <SortableHead label="Valor" sortKey="value" activeSort={sort} onSort={updateSort} />
            <SortableHead label="Status" sortKey="status" activeSort={sort} onSort={updateSort} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {topSpacer ? (
            <TableRow>
              <TableCell className="p-0" colSpan={10} style={{ height: topSpacer }} />
            </TableRow>
          ) : null}
          {visibleAgreements.map((agreement) => (
            <AgreementRow agreement={agreement} key={agreement.id} />
          ))}
          {bottomSpacer ? (
            <TableRow>
              <TableCell className="p-0" colSpan={10} style={{ height: bottomSpacer }} />
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
});

function RankingCard({ title, description, rows, valueKey = "total", valueFormatter = (value) => value }) {
  return (
    <Card className="border-white/10 bg-white/[0.04] shadow-none">
      <CardHeader className="border-b border-white/10 px-4 py-3">
        <CardTitle className="text-base text-white">{title}</CardTitle>
        <CardDescription className="text-zinc-400">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length ? (
          <div className="divide-y divide-white/10">
            {rows.map((row, index) => (
              <div className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3" key={row.condominium}>
                <div className="grid size-7 place-items-center rounded-md bg-white/10 text-xs font-semibold text-zinc-300">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{row.condominium || "Sem condomínio"}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {row.total} acordos, {row.received + row.finalized} concluídos
                  </p>
                </div>
                <div className="text-right text-sm font-semibold text-white">{valueFormatter(row[valueKey])}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-sm text-zinc-400">Nenhum dado disponível.</div>
        )}
      </CardContent>
    </Card>
  );
}

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [data, setData] = useState({
    updatedAt: null,
    total: 0,
    filtered: 0,
    condominiums: [],
    statuses: [],
    agreements: [],
  });
  const [filters, setFilters] = useState({
    search: "",
    condominium: "",
    status: "",
    dueFrom: "",
    dueTo: "",
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  async function loadAgreements() {
    const response = await fetch(`${API_URL}/api/agreements${query ? `?${query}` : ""}`);
    if (!response.ok) throw new Error("Não foi possível carregar os acordos.");
    setData(await response.json());
  }

  useEffect(() => {
    loadAgreements().catch((currentError) => setError(currentError.message));
  }, [query]);

  async function handleImport(event) {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setFeedback("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/api/import`, {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao importar a planilha.");

      setFeedback(
        `Importação concluída: ${result.created} novos, ${result.updated} atualizados, ${result.total} no total.`
      );
      setFile(null);
      await loadAgreements();
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAll() {
    if (deleteConfirmation !== "Excluir") return;

    setDeleting(true);
    setError("");
    setFeedback("");

    try {
      const response = await fetch(`${API_URL}/api/agreements`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Falha ao excluir os acordos.");

      setFeedback(`Exclusão concluída: ${result.deleted} acordos removidos.`);
      setDeleteConfirmation("");
      setDeleteOpen(false);
      await loadAgreements();
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setDeleting(false);
    }
  }

  const financialSummary = useMemo(
    () =>
      data.agreements.reduce(
        (summary, agreement) => {
          const value = agreement.value || 0;
          const receivedValue = agreement.receivedValue || 0;
          const status = agreement.effectiveStatus || agreement.status;

          summary.filtered += value;

          if (status === "Recebido") {
            summary.received += receivedValue || value;
          }

          if (status === "Cancelado") {
            summary.canceled += value;
          }

          if (status === "Em aberto" || status === "Vencido") {
            summary.receivable += agreement.updatedValue || value;
          }

          return summary;
        },
        { filtered: 0, received: 0, canceled: 0, receivable: 0 }
      ),
    [data.agreements]
  );
  const latestImport = data.updatedAt ? new Date(data.updatedAt).toLocaleString("pt-BR") : "-";
  const todayIso = new Date().toISOString().slice(0, 10);
  const condominiumRankings = useMemo(() => {
    const byCondominium = new Map();

    data.agreements.forEach((agreement) => {
      const key = agreement.condominium || "Sem condomínio";
      const current =
        byCondominium.get(key) || {
          condominium: key,
          total: 0,
          received: 0,
          finalized: 0,
          canceled: 0,
          completed: 0,
          overdue: 0,
          receivable: 0,
          recoveredValue: 0,
          completionDaysSum: 0,
          completionDaysCount: 0,
          overdueDaysSum: 0,
          overdueDaysCount: 0,
          avgCompletionDays: 0,
          avgOverdueDays: 0,
        };

      current.total += 1;
      const status = agreement.effectiveStatus || agreement.status;

      if (status === "Recebido") {
        current.received += 1;
        current.recoveredValue += agreement.receivedValue || agreement.value || 0;
      }
      if (status === "Finalizado") current.finalized += 1;
      if (status === "Cancelado") current.canceled += 1;
      current.completed = current.received + current.finalized;

      const completionDays = daysBetween(agreement.agreementDate, agreement.receiptDate);
      if (completionDays !== null && (status === "Recebido" || status === "Finalizado")) {
        current.completionDaysSum += completionDays;
        current.completionDaysCount += 1;
      }

      if (isOverdueAgreement(agreement, todayIso)) {
        const overdueDays = daysBetween(agreement.dueDate, todayIso);

        current.overdue += 1;
        current.receivable += agreement.updatedValue || agreement.value || 0;
        current.overdueDaysSum += overdueDays || 0;
        current.overdueDaysCount += 1;
      }

      byCondominium.set(key, current);
    });

    const rows = [...byCondominium.values()].map((row) => ({
      ...row,
      avgCompletionDays: row.completionDaysCount ? row.completionDaysSum / row.completionDaysCount : 0,
      avgOverdueDays: row.overdueDaysCount ? row.overdueDaysSum / row.overdueDaysCount : 0,
    }));
    const totals = rows.reduce(
      (summary, row) => ({
        overdue: summary.overdue + row.overdue,
        receivable: summary.receivable + row.receivable,
        recoveredValue: summary.recoveredValue + row.recoveredValue,
        completionDaysSum: summary.completionDaysSum + row.completionDaysSum,
        completionDaysCount: summary.completionDaysCount + row.completionDaysCount,
        overdueDaysSum: summary.overdueDaysSum + row.overdueDaysSum,
        overdueDaysCount: summary.overdueDaysCount + row.overdueDaysCount,
      }),
      {
        overdue: 0,
        receivable: 0,
        recoveredValue: 0,
        completionDaysSum: 0,
        completionDaysCount: 0,
        overdueDaysSum: 0,
        overdueDaysCount: 0,
      }
    );
    totals.avgCompletionDays = totals.completionDaysCount
      ? totals.completionDaysSum / totals.completionDaysCount
      : 0;
    totals.avgOverdueDays = totals.overdueDaysCount ? totals.overdueDaysSum / totals.overdueDaysCount : 0;

    return {
      totals,
      totalCondominiums: rows.length,
      mostAgreements: [...rows].sort((a, b) => b.total - a.total).slice(0, 10),
      mostCompleted: [...rows].sort((a, b) => b.completed - a.completed).slice(0, 10),
      mostCanceled: [...rows].sort((a, b) => b.canceled - a.canceled).slice(0, 10),
      mostOverdue: [...rows].sort((a, b) => b.overdue - a.overdue).slice(0, 10),
      mostRecovered: [...rows].sort((a, b) => b.recoveredValue - a.recoveredValue).slice(0, 10),
      longestCompletion: [...rows]
        .filter((row) => row.completionDaysCount)
        .sort((a, b) => b.avgCompletionDays - a.avgCompletionDays)
        .slice(0, 10),
      longestOverdue: [...rows]
        .filter((row) => row.overdueDaysCount)
        .sort((a, b) => b.avgOverdueDays - a.avgOverdueDays)
        .slice(0, 10),
    };
  }, [data.agreements, todayIso]);

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#080808] lg:block">
          <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
            <div className="grid size-9 place-items-center rounded-md border border-white/10 bg-white text-zinc-950">
              <WalletCards size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-white">Carteira</p>
              <p className="mt-1 text-xs text-zinc-500">Acordos</p>
            </div>
          </div>

          <nav className="grid gap-1 p-3">
            <button
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition hover:bg-white/[0.05] hover:text-zinc-200",
                activeView === "overview" ? "bg-white/[0.08] text-white" : "text-zinc-500"
              )}
              type="button"
              onClick={() => setActiveView("overview")}
            >
              <WalletCards size={17} aria-hidden="true" />
              Visão geral
            </button>
            <button
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition hover:bg-white/[0.05] hover:text-zinc-200",
                activeView === "condominiums" ? "bg-white/[0.08] text-white" : "text-zinc-500"
              )}
              type="button"
              onClick={() => setActiveView("condominiums")}
            >
              <Building2 size={17} aria-hidden="true" />
              Condomínios
            </button>
            <button className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200">
              <CalendarDays size={17} aria-hidden="true" />
              Vencimentos
            </button>
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-10 border-b border-white/10 bg-[#050505]/95 backdrop-blur">
            <div className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-normal text-white">
                  Carteira de Acordos
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  {data.total} acordos cadastrados, {data.filtered} no filtro atual.
                </p>
              </div>

              <form className="grid gap-2 sm:grid-cols-[auto_minmax(180px,280px)_auto]" onSubmit={handleImport}>
                <label className={cn(buttonVariants({ variant: "outline" }), "relative cursor-pointer overflow-hidden border-white/15 bg-transparent text-white hover:bg-white/10")}>
                  <FileSpreadsheet aria-hidden="true" />
                  Planilha
                  <input
                    className="absolute inset-0 cursor-pointer opacity-0"
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </label>
                <div className="flex h-10 items-center rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-zinc-400">
                  <span className="truncate">{file?.name || "Nenhum arquivo selecionado"}</span>
                </div>
                <Button disabled={!file || loading} type="submit">
                  <UploadCloud aria-hidden="true" />
                  {loading ? "Importando" : "Importar"}
                </Button>
              </form>
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6">
            {activeView === "overview" ? (
              <>
            <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[repeat(2,minmax(170px,0.7fr))_repeat(4,minmax(240px,1fr))_minmax(220px,0.9fr)]" aria-label="Resumo da carteira">
              <Metric label="Acordos na base" value={data.total} />
              <Metric label="Resultado filtrado" value={data.filtered} />
              <Metric label="Valor filtrado" value={formatCurrency(financialSummary.filtered)} />
              <Metric label="Valor recebido" value={formatCurrency(financialSummary.received)} />
              <Metric label="Valor acordos cancelados" value={formatCurrency(financialSummary.canceled)} />
              <Metric label="Valor a receber" value={formatCurrency(financialSummary.receivable)} />
              <Metric label="Última importação" value={latestImport} />
            </section>

            <Card className="mb-4 border-white/10 bg-white/[0.04] shadow-none">
              <CardHeader className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base text-white">Filtros</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Busca por identificação, condomínio e vencimento.
                  </CardDescription>
                </div>
                <Button
                  className="w-full border-white/15 bg-transparent text-white hover:bg-white/10 sm:w-auto"
                  variant="outline"
                  type="button"
                  onClick={() => setFilters({ search: "", condominium: "", status: "", dueFrom: "", dueTo: "" })}
                >
                  <FilterX aria-hidden="true" />
                  Limpar
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <section className="grid items-end gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(240px,1.35fr)_minmax(190px,0.9fr)_minmax(150px,0.7fr)_minmax(155px,0.7fr)_minmax(155px,0.7fr)]">
                  <Field id="search" label="Busca" icon={<Search size={17} aria-hidden="true" />}>
                    <input
                      id="search"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                      placeholder="Nome, acordo ou parcela"
                      value={filters.search}
                      onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                    />
                  </Field>

                  <DropdownFilter
                    id="condominium"
                    label="Condomínio"
                    options={data.condominiums}
                    value={filters.condominium}
                    onChange={(value) => setFilters((current) => ({ ...current, condominium: value }))}
                  />

                  <DropdownFilter
                    id="status"
                    label="Status"
                    options={data.statuses}
                    value={filters.status}
                    onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
                  />

                  <Field id="dueFrom" label="Vencimento de" icon={<CalendarDays size={17} aria-hidden="true" />}>
                    <input
                      id="dueFrom"
                      type="date"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                      value={filters.dueFrom}
                      onChange={(event) => setFilters((current) => ({ ...current, dueFrom: event.target.value }))}
                    />
                  </Field>

                  <Field id="dueTo" label="Vencimento até" icon={<CalendarDays size={17} aria-hidden="true" />}>
                    <input
                      id="dueTo"
                      type="date"
                      className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none"
                      value={filters.dueTo}
                      onChange={(event) => setFilters((current) => ({ ...current, dueTo: event.target.value }))}
                    />
                  </Field>
                </section>
              </CardContent>
            </Card>

            {feedback ? <p className="mb-3 text-sm font-medium text-zinc-200">{feedback}</p> : null}
            {error ? <p className="mb-3 text-sm font-medium text-red-400">{error}</p> : null}

            <Card className="overflow-hidden border-white/10 bg-white/[0.04] shadow-none">
              <CardHeader className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base text-white">Acordos</CardTitle>
                  <CardDescription className="text-zinc-400">
                    {data.filtered} registros encontrados
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit gap-1.5 rounded-md border-white/15 text-zinc-200">
                  <CircleDollarSign size={14} aria-hidden="true" />
                  {formatCurrency(financialSummary.filtered)}
                </Badge>
              </CardHeader>
              {data.agreements.length ? (
                <AgreementsTable agreements={data.agreements} />
              ) : (
                <div className="grid min-h-[280px] place-items-center p-8 text-center">
                  <div>
                    <p className="font-medium text-white">Nenhum acordo carregado</p>
                    <p className="mt-1 text-sm text-zinc-400">
                      Importe uma planilha para começar a visualizar a carteira.
                    </p>
                  </div>
                </div>
              )}
            </Card>
              </>
            ) : (
              <section className="grid gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-normal text-white">Condomínios</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Rankings por quantidade de acordos, conclusão, cancelamento e inadimplência.
                  </p>
                </div>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7" aria-label="Resumo de condomínios">
                  <Metric label="Condomínios no filtro" value={condominiumRankings.totalCondominiums} />
                  <Metric label="Acordos vencidos" value={condominiumRankings.totals.overdue} />
                  <Metric
                    label="Valor vencido"
                    value={formatCurrency(condominiumRankings.totals.receivable)}
                  />
                  <Metric
                    label="Valores recuperados"
                    value={formatCurrency(condominiumRankings.totals.recoveredValue)}
                  />
                  <Metric
                    label="Média conclusão"
                    value={formatDays(condominiumRankings.totals.avgCompletionDays)}
                  />
                  <Metric
                    label="Média inadimplência"
                    value={formatDays(condominiumRankings.totals.avgOverdueDays)}
                  />
                  <Metric label="Base filtrada" value={data.filtered} />
                </section>

                <section className="grid gap-4 xl:grid-cols-2">
                  <RankingCard
                    title="Ranking de condomínios com mais acordos"
                    description="Top 10 por quantidade de parcelas/acordos no filtro atual."
                    rows={condominiumRankings.mostAgreements}
                    valueKey="total"
                  />
                  <RankingCard
                    title="Mais acordos concluídos"
                    description="Considera parcelas recebidas ou finalizadas."
                    rows={condominiumRankings.mostCompleted}
                    valueKey="completed"
                  />
                  <RankingCard
                    title="Mais acordos cancelados"
                    description="Top 10 por parcelas com status cancelado."
                    rows={condominiumRankings.mostCanceled}
                    valueKey="canceled"
                  />
                  <RankingCard
                    title="Mais acordos inadimplentes"
                    description="Vencimento anterior a hoje, sem recebimento e não cancelado."
                    rows={condominiumRankings.mostOverdue}
                    valueKey="overdue"
                  />
                  <RankingCard
                    title="Maior valor recuperado"
                    description="Soma de valores recebidos por condomínio."
                    rows={condominiumRankings.mostRecovered}
                    valueKey="recoveredValue"
                    valueFormatter={formatCurrency}
                  />
                  <RankingCard
                    title="Maior média de conclusão"
                    description="Dias entre data do acordo e recebimento."
                    rows={condominiumRankings.longestCompletion}
                    valueKey="avgCompletionDays"
                    valueFormatter={formatDays}
                  />
                  <RankingCard
                    title="Maior média de inadimplência"
                    description="Dias em atraso para parcelas vencidas em aberto."
                    rows={condominiumRankings.longestOverdue}
                    valueKey="avgOverdueDays"
                    valueFormatter={formatDays}
                  />
                </section>
              </section>
            )}
          </div>
        </section>
      </div>

      <div className="fixed bottom-4 left-4 z-20 w-[calc(100%-2rem)] max-w-sm">
        {deleteOpen ? (
          <Card className="mb-3 border-white/10 bg-[#0f0f0f] shadow-2xl shadow-black/40">
            <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-white/10 p-4">
              <div>
                <CardTitle className="text-base text-white">Excluir acordos</CardTitle>
                <CardDescription className="mt-1 text-zinc-400">
                  Digite Excluir para confirmar a remoção de todos os acordos.
                </CardDescription>
              </div>
              <button
                className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-400 transition hover:bg-white/10 hover:text-white"
                type="button"
                title="Fechar"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteConfirmation("");
                }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </CardHeader>
            <CardContent className="grid gap-3 p-4">
              <input
                className="h-10 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-white/45"
                placeholder="Excluir"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
              />
              <Button
                className="bg-red-500 text-white hover:bg-red-500/90"
                disabled={deleteConfirmation !== "Excluir" || deleting}
                type="button"
                onClick={handleDeleteAll}
              >
                <Trash2 aria-hidden="true" />
                {deleting ? "Excluindo" : "Confirmar exclusão"}
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Button
          className="border-white/15 bg-white/[0.04] text-white hover:bg-white/10"
          variant="outline"
          type="button"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 aria-hidden="true" />
          Excluir todos
        </Button>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
