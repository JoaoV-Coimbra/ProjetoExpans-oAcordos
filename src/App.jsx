import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  FilterX,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:3001" : "");

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

function formatPercentage(value) {
  if (!Number.isFinite(value)) return "-";

  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getInstallmentValue(agreement) {
  return agreement.updatedValue ?? agreement.value ?? 0;
}

function getRecoveryRate(receivedValue, recoverableValue) {
  return recoverableValue > 0 ? receivedValue / recoverableValue : null;
}

async function readApiResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  const result = contentType.includes("application/json") ? await response.json() : { detail: await response.text() };

  if (!response.ok) {
    const message = result.error || fallbackMessage;
    const detail = result.detail && result.detail !== message ? ` ${result.detail}` : "";
    throw new Error(`${message}.${detail}`.trim());
  }

  return result;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
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

function addDaysIso(dateIso, amount) {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setDate(date.getDate() + amount);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function Metric({ label, value }) {
  return (
    <Card className="min-h-[104px] border-white/10 bg-white/[0.04] shadow-none">
      <CardContent className="p-4">
        <p className="text-xs font-medium text-zinc-400">{label}</p>
        <p className="mt-4 whitespace-nowrap text-[clamp(1rem,1.05vw,1.5rem)] font-semibold tracking-normal text-white">
          {value}
        </p>
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

function AgreementTagBadges({ tags }) {
  const visibleTags = (tags || []).filter(Boolean);
  if (!visibleTags.length) return null;

  return visibleTags.map((tag) => (
    <Badge variant="secondary" className="bg-cyan-500/15 text-cyan-100" key={tag}>
      {tag}
    </Badge>
  ));
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
      <TableCell className="text-zinc-300">{formatCurrency(getInstallmentValue(agreement))}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1.5">
          {status ? (
            <Badge variant="secondary" className={statusClassName}>
              {status}
            </Badge>
          ) : (
            <span className="text-zinc-500">-</span>
          )}
          <AgreementTagBadges tags={agreement.tags} />
        </div>
        {agreement.correctionStatus ? (
          <div className="mt-1 text-xs text-zinc-500">{agreement.correctionStatus}</div>
        ) : null}
      </TableCell>
    </TableRow>
  );
});

function getSortValue(agreement, key) {
  if (key === "status") return agreement.effectiveStatus || agreement.status || "";
  if (key === "value") return getInstallmentValue(agreement);
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

function ProfileAgreementField({ label, children }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase text-zinc-500">{label}</p>
      <div className="mt-1 break-words text-sm text-zinc-200">{children || <span className="text-zinc-500">-</span>}</div>
    </div>
  );
}

function ProfileAgreementsList({ agreements }) {
  return (
    <CardContent className="max-h-[640px] overflow-y-auto p-0">
      <div className="divide-y divide-white/10">
        {agreements.map((agreement) => {
          const status = agreement.effectiveStatus || agreement.status;
          const statusClassName =
            status === "Vencido"
              ? "bg-red-500/15 text-red-200"
              : status === "Cancelado"
                ? "bg-zinc-500/15 text-zinc-300"
                : "bg-white/10 text-zinc-200";

          return (
            <article className="grid gap-3 px-4 py-3" key={agreement.id}>
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Acordo {agreement.agreementId}</p>
                  <p className="mt-1 break-words text-xs text-zinc-500">
                    {agreement.personName || "Sem nome"}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {status ? (
                    <Badge variant="secondary" className={statusClassName}>
                      {status}
                    </Badge>
                  ) : null}
                  <AgreementTagBadges tags={agreement.tags} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                <ProfileAgreementField label="Parcela">
                  {agreement.installment || "-"}
                  {agreement.installmentCount ? (
                    <span className="text-zinc-500">/{agreement.installmentCount}</span>
                  ) : null}
                  {agreement.parcelId ? <div className="mt-1 text-xs text-zinc-500">ID {agreement.parcelId}</div> : null}
                </ProfileAgreementField>
                <ProfileAgreementField label="Unidade">
                  {agreement.unit || "-"}
                  {agreement.admUnit ? <div className="mt-1 text-xs text-zinc-500">ADM {agreement.admUnit}</div> : null}
                </ProfileAgreementField>
                <ProfileAgreementField label="Condominio">
                  {agreement.condominium || "-"}
                  {agreement.administrator ? (
                    <div className="mt-1 text-xs text-zinc-500">{agreement.administrator}</div>
                  ) : null}
                </ProfileAgreementField>
                <ProfileAgreementField label="Firmacao">{formatDate(agreement.agreementDate)}</ProfileAgreementField>
                <ProfileAgreementField label="Vencimento">{formatDate(agreement.dueDate)}</ProfileAgreementField>
                <ProfileAgreementField label="Recebimento">{formatDate(agreement.receiptDate)}</ProfileAgreementField>
                <ProfileAgreementField label="Valor atualizado">
                  {formatCurrency(getInstallmentValue(agreement))}
                </ProfileAgreementField>
                <ProfileAgreementField label="Correcao">
                  {agreement.correctionStatus || "-"}
                </ProfileAgreementField>
              </div>
            </article>
          );
        })}
      </div>
    </CardContent>
  );
}

function ProfilesView({ agreements, search, onSearchChange, selectedProfile, onSelectProfile }) {
  const [selectedAgreementId, setSelectedAgreementId] = useState("");
  const profileListRef = useRef(null);
  const profileFrameRef = useRef(null);
  const [profileScrollTop, setProfileScrollTop] = useState(0);
  const profileRows = useMemo(() => {
    const byPerson = new Map();

    agreements.forEach((agreement) => {
      const name = agreement.personName?.trim();
      if (!name) return;

      const key = normalizeText(name);
      const current =
        byPerson.get(key) || {
          key,
          name,
          total: 0,
          agreements: new Set(),
          receivable: 0,
          received: 0,
          recoverable: 0,
          overdue: 0,
        };
      const status = agreement.effectiveStatus || agreement.status;
      const value = getInstallmentValue(agreement);

      current.total += 1;
      current.agreements.add(agreement.agreementId);

      if (status !== "Cancelado") {
        current.recoverable += value;
      }

      if (status === "Recebido") {
        current.received += agreement.receivedValue || value;
      }

      if (status === "Em aberto" || status === "Vencido") {
        current.receivable += value;
      }

      if (isOverdueAgreement(agreement, new Date().toISOString().slice(0, 10))) {
        current.overdue += 1;
      }

      byPerson.set(key, current);
    });

    return [...byPerson.values()]
      .map((row) => ({
        ...row,
        agreementCount: row.agreements.size,
        recoveryRate: getRecoveryRate(row.received, row.recoverable),
      }))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "pt-BR"));
  }, [agreements]);
  const normalizedSearch = normalizeText(search);
  const matchingProfiles = useMemo(
    () =>
      profileRows.filter((row) => !normalizedSearch || normalizeText(row.name).includes(normalizedSearch)),
    [normalizedSearch, profileRows]
  );
  const PROFILE_ROW_HEIGHT = 104;
  const PROFILE_VIEWPORT_HEIGHT = 224;
  const PROFILE_OVERSCAN = 6;
  const profileStartIndex = Math.max(0, Math.floor(profileScrollTop / PROFILE_ROW_HEIGHT) - PROFILE_OVERSCAN);
  const profileVisibleCount = Math.ceil(PROFILE_VIEWPORT_HEIGHT / PROFILE_ROW_HEIGHT) + PROFILE_OVERSCAN * 2;
  const profileEndIndex = Math.min(matchingProfiles.length, profileStartIndex + profileVisibleCount);
  const visibleProfiles = matchingProfiles.slice(profileStartIndex, profileEndIndex);
  const profileTopSpacer = profileStartIndex * PROFILE_ROW_HEIGHT;
  const profileBottomSpacer = Math.max(0, (matchingProfiles.length - profileEndIndex) * PROFILE_ROW_HEIGHT);
  const selectedProfileKey = normalizeText(selectedProfile);
  const selectedExists = selectedProfileKey && profileRows.some((row) => row.key === selectedProfileKey);
  const activeProfile = selectedExists ? selectedProfile : normalizedSearch ? matchingProfiles[0]?.name || "" : "";
  const activeProfileKey = normalizeText(activeProfile);
  const activeAgreements = useMemo(
    () => agreements.filter((agreement) => normalizeText(agreement.personName) === activeProfileKey),
    [activeProfileKey, agreements]
  );
  const agreementOptions = useMemo(() => {
    const byAgreement = new Map();

    activeAgreements.forEach((agreement) => {
      const agreementId = agreement.agreementId || "Sem acordo";
      const current =
        byAgreement.get(agreementId) || {
          agreementId,
          total: 0,
          receivable: 0,
          received: 0,
          completedCount: 0,
          canceledCount: 0,
          inProgressCount: 0,
          tags: new Set(),
        };
      const status = agreement.effectiveStatus || agreement.status;
      const value = getInstallmentValue(agreement);

      current.total += 1;
      (agreement.tags || []).forEach((tag) => current.tags.add(tag));
      if (status === "Cancelado") {
        current.canceledCount += 1;
      } else if (status === "Recebido" || status === "Finalizado") {
        current.completedCount += 1;
      } else {
        current.inProgressCount += 1;
      }

      if (status === "Recebido") {
        current.received += agreement.receivedValue || value;
      }
      if (status === "Em aberto" || status === "Vencido") {
        current.receivable += value;
      }

      byAgreement.set(agreementId, current);
    });

    return [...byAgreement.values()]
      .map((agreement) => ({
        ...agreement,
        tags: [...agreement.tags],
        status:
          agreement.inProgressCount > 0
            ? "Em andamento"
            : agreement.canceledCount === agreement.total
              ? "Cancelado"
              : "Concluído",
      }))
      .sort((a, b) => String(a.agreementId).localeCompare(String(b.agreementId), "pt-BR", { numeric: true }));
  }, [activeAgreements]);
  const selectedAgreementAgreements = useMemo(
    () =>
      selectedAgreementId
        ? activeAgreements.filter((agreement) => agreement.agreementId === selectedAgreementId)
        : activeAgreements,
    [activeAgreements, selectedAgreementId]
  );
  const profileSummary = useMemo(() => {
    const summary = {
      total: 0,
      agreementIds: new Set(),
      condominiums: new Set(),
      open: 0,
      overdue: 0,
      received: 0,
      finalized: 0,
      canceled: 0,
      receivable: 0,
      receivedValue: 0,
      recoverableValue: 0,
    };

    activeAgreements.forEach((agreement) => {
      const status = agreement.effectiveStatus || agreement.status;
      const value = getInstallmentValue(agreement);

      summary.total += 1;
      if (agreement.agreementId) summary.agreementIds.add(agreement.agreementId);
      if (agreement.condominium) summary.condominiums.add(agreement.condominium);

      if (status !== "Cancelado") {
        summary.recoverableValue += value;
      }

      if (status === "Recebido") {
        summary.received += 1;
        summary.receivedValue += agreement.receivedValue || value;
      } else if (status === "Finalizado") {
        summary.finalized += 1;
      } else if (status === "Cancelado") {
        summary.canceled += 1;
      } else if (status === "Vencido") {
        summary.overdue += 1;
        summary.receivable += value;
      } else {
        summary.open += 1;
        summary.receivable += value;
      }
    });

    return {
      ...summary,
      recoveryRate: getRecoveryRate(summary.receivedValue, summary.recoverableValue),
      agreementCount: summary.agreementIds.size,
      condominiumCount: summary.condominiums.size,
      condominiumList: [...summary.condominiums].sort((a, b) => a.localeCompare(b, "pt-BR")),
    };
  }, [activeAgreements]);

  useEffect(() => {
    setSelectedAgreementId("");
  }, [activeProfileKey]);

  useEffect(() => {
    setProfileScrollTop(0);
    if (profileListRef.current) {
      profileListRef.current.scrollTop = 0;
    }
  }, [normalizedSearch]);

  useEffect(() => {
    if (!selectedAgreementId) return;
    if (!agreementOptions.some((agreement) => agreement.agreementId === selectedAgreementId)) {
      setSelectedAgreementId("");
    }
  }, [agreementOptions, selectedAgreementId]);

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-normal text-white">Perfis</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Pesquise uma pessoa da base para ver os acordos, valores e situacao dela.
        </p>
      </div>

      <Card className="border-white/10 bg-white/[0.04] shadow-none">
        <CardHeader className="border-b border-white/10 px-4 py-3">
          <CardTitle className="text-base text-white">Buscar pessoa</CardTitle>
          <CardDescription className="text-zinc-400">
            Digite parte do nome e selecione um perfil encontrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 p-4 xl:grid-cols-[minmax(260px,420px)_1fr]">
          <Field id="profileSearch" label="Nome" icon={<Search size={17} aria-hidden="true" />}>
            <input
              id="profileSearch"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              placeholder="Nome da pessoa"
              value={search}
              onChange={(event) => {
                onSearchChange(event.target.value);
                onSelectProfile("");
              }}
            />
          </Field>

          <div className="min-w-0">
            <p className="mb-2 text-xs font-medium text-zinc-400">
              {matchingProfiles.length} perfis encontrados
            </p>
            {matchingProfiles.length ? (
              <div
                ref={profileListRef}
                className="h-56 overflow-y-auto pr-1"
                onScroll={(event) => {
                  const nextScrollTop = event.currentTarget.scrollTop;
                  if (profileFrameRef.current) return;
                  profileFrameRef.current = window.requestAnimationFrame(() => {
                    setProfileScrollTop(nextScrollTop);
                    profileFrameRef.current = null;
                  });
                }}
              >
                <div className="relative" style={{ height: matchingProfiles.length * PROFILE_ROW_HEIGHT }}>
                  {profileTopSpacer ? <div className="absolute left-0 right-0" style={{ height: profileTopSpacer }} /> : null}
                {visibleProfiles.map((profile, offset) => {
                  const active = normalizeText(activeProfile) === profile.key;
                  const profileIndex = profileStartIndex + offset;

                  return (
                    <button
                      className={cn(
                        "absolute left-0 right-0 grid min-h-[88px] min-w-0 gap-1 rounded-md border px-3 py-2 text-left transition",
                        active
                          ? "border-white/30 bg-white/[0.1] text-white"
                          : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]"
                      )}
                      key={profile.key}
                      style={{ top: profileIndex * PROFILE_ROW_HEIGHT }}
                      type="button"
                      onClick={() => onSelectProfile(profile.name)}
                    >
                      <span className="truncate text-sm font-medium">{profile.name}</span>
                      <span className="text-xs text-zinc-500">
                        {profile.total} registros, {profile.agreementCount} acordos
                      </span>
                      <span className="text-xs text-zinc-500">
                        {formatCurrency(profile.receivable)} a receber
                      </span>
                      <span className="text-xs text-zinc-500">
                        Recuperação {formatPercentage(profile.recoveryRate)}
                      </span>
                    </button>
                  );
                })}
                  {profileBottomSpacer ? (
                    <div
                      className="absolute left-0 right-0"
                      style={{ top: profileEndIndex * PROFILE_ROW_HEIGHT, height: profileBottomSpacer }}
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid min-h-[120px] place-items-center rounded-md border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-zinc-400">
                Nenhum perfil encontrado na base atual.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {activeProfile ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8" aria-label="Resumo do perfil">
            <Metric label="Registros do perfil" value={profileSummary.total} />
            <Metric label="Acordos distintos" value={profileSummary.agreementCount} />
            <Metric label="Condominios" value={profileSummary.condominiumCount} />
            <Metric label="Em aberto" value={profileSummary.open} />
            <Metric label="Vencidos" value={profileSummary.overdue} />
            <Metric label="Valor recebido" value={formatCurrency(profileSummary.receivedValue)} />
            <Metric label="Valor a receber" value={formatCurrency(profileSummary.receivable)} />
            <Metric label="Taxa recuperação" value={formatPercentage(profileSummary.recoveryRate)} />
          </section>

          <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(260px,360px)_minmax(0,1fr)]">
            <Card className="border-white/10 bg-white/[0.04] shadow-none">
              <CardHeader className="border-b border-white/10 px-4 py-3">
                <CardTitle className="truncate text-base text-white">{activeProfile}</CardTitle>
                <CardDescription className="text-zinc-400">
                  {profileSummary.total} registros em {profileSummary.condominiumCount} condominios.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-white/10 text-zinc-200">
                    Recebidos: {profileSummary.received}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-zinc-200">
                    Finalizados: {profileSummary.finalized}
                  </Badge>
                  <Badge variant="secondary" className="bg-red-500/15 text-red-200">
                    Vencidos: {profileSummary.overdue}
                  </Badge>
                  <Badge variant="secondary" className="bg-zinc-500/15 text-zinc-300">
                    Cancelados: {profileSummary.canceled}
                  </Badge>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-400">Condominios vinculados</p>
                  {profileSummary.condominiumList.length ? (
                    <div className="grid gap-2">
                      {profileSummary.condominiumList.map((condominium) => (
                        <div
                          className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300"
                          key={condominium}
                        >
                          {condominium}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">Sem condominio informado.</p>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-400">Acordos</p>
                  <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                    <button
                      className={cn(
                        "grid min-h-[50px] rounded-md border px-3 py-2 text-left transition",
                        !selectedAgreementId
                          ? "border-white/30 bg-white/[0.1] text-white"
                          : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]"
                      )}
                      type="button"
                      onClick={() => setSelectedAgreementId("")}
                    >
                      <span className="text-sm font-medium">Todos</span>
                      <span className="mt-1 text-xs text-zinc-500">{activeAgreements.length} parcelas/registros</span>
                    </button>

                    {agreementOptions.map((agreement) => {
                      const active = selectedAgreementId === agreement.agreementId;
                      const agreementStatusClassName =
                        agreement.status === "Em andamento"
                          ? "bg-yellow-500/15 text-yellow-100"
                          : agreement.status === "Cancelado"
                            ? "bg-zinc-500/15 text-zinc-300"
                            : "bg-emerald-500/15 text-emerald-100";

                      return (
                        <button
                          className={cn(
                            "grid min-h-[62px] rounded-md border px-3 py-2 text-left transition",
                            active
                              ? "border-white/30 bg-white/[0.1] text-white"
                              : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.07]"
                          )}
                          key={agreement.agreementId}
                          type="button"
                          onClick={() => setSelectedAgreementId(agreement.agreementId)}
                        >
                          <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold">Acordo {agreement.agreementId}</span>
                            <Badge variant="secondary" className={agreementStatusClassName}>
                              {agreement.status}
                            </Badge>
                            <AgreementTagBadges tags={agreement.tags} />
                          </span>
                          <span className="mt-1 text-xs text-zinc-500">
                            {agreement.total} parcelas/registros
                          </span>
                          <span className="mt-1 text-xs text-zinc-500">
                            {formatCurrency(agreement.receivable)} a receber
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 overflow-hidden border-white/10 bg-white/[0.04] shadow-none">
              <CardHeader className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base text-white">
                    {selectedAgreementId ? `Parcelas do acordo ${selectedAgreementId}` : "Acordos do perfil"}
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    {selectedAgreementAgreements.length} registros encontrados
                  </CardDescription>
                </div>
                <Badge variant="outline" className="w-fit gap-1.5 rounded-md border-white/15 text-zinc-200">
                  <CircleDollarSign size={14} aria-hidden="true" />
                  {formatCurrency(profileSummary.receivable)}
                </Badge>
              </CardHeader>
              <ProfileAgreementsList agreements={selectedAgreementAgreements} />
            </Card>
          </section>
        </>
      ) : null}
    </section>
  );
}

function DueDatesView({ agreements }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const dueLimitIso = addDaysIso(todayIso, 5);
  const dueSoonAgreements = useMemo(
    () =>
      agreements
        .filter((agreement) => {
          const status = agreement.effectiveStatus || agreement.status;

          return (
            agreement.dueDate &&
            agreement.dueDate >= todayIso &&
            agreement.dueDate <= dueLimitIso &&
            status !== "Recebido" &&
            status !== "Finalizado" &&
            status !== "Cancelado"
          );
        })
        .sort((a, b) => {
          const dateCompare = String(a.dueDate).localeCompare(String(b.dueDate));
          if (dateCompare !== 0) return dateCompare;
          return String(a.agreementId).localeCompare(String(b.agreementId), "pt-BR", { numeric: true });
        }),
    [agreements, dueLimitIso, todayIso]
  );
  const dueSummary = useMemo(
    () =>
      dueSoonAgreements.reduce(
        (summary, agreement) => {
          const daysToDue = daysBetween(todayIso, agreement.dueDate) ?? 0;

          summary.value += getInstallmentValue(agreement);
          summary.agreements.add(agreement.agreementId);
          if (agreement.personName) summary.people.add(normalizeText(agreement.personName));
          if (agreement.condominium) summary.condominiums.add(agreement.condominium);
          if (daysToDue === 0) summary.today += 1;

          return summary;
        },
        {
          value: 0,
          today: 0,
          agreements: new Set(),
          people: new Set(),
          condominiums: new Set(),
        }
      ),
    [dueSoonAgreements, todayIso]
  );

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-normal text-white">Vencimentos</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Parcelas em aberto com vencimento de {formatDate(todayIso)} até {formatDate(dueLimitIso)}.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Resumo de vencimentos">
        <Metric label="Vencem até 5 dias" value={dueSoonAgreements.length} />
        <Metric label="Vencem hoje" value={dueSummary.today} />
        <Metric label="Valor próximo" value={formatCurrency(dueSummary.value)} />
        <Metric label="Pessoas" value={dueSummary.people.size} />
        <Metric label="Condomínios" value={dueSummary.condominiums.size} />
      </section>

      <Card className="min-w-0 overflow-hidden border-white/10 bg-white/[0.04] shadow-none">
        <CardHeader className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base text-white">Parcelas próximas</CardTitle>
            <CardDescription className="text-zinc-400">
              {dueSoonAgreements.length} registros encontrados em {dueSummary.agreements.size} acordos.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit gap-1.5 rounded-md border-white/15 text-zinc-200">
            <CalendarDays size={14} aria-hidden="true" />
            {formatCurrency(dueSummary.value)}
          </Badge>
        </CardHeader>
        {dueSoonAgreements.length ? (
          <AgreementsTable agreements={dueSoonAgreements} />
        ) : (
          <div className="grid min-h-[260px] place-items-center p-8 text-center">
            <div>
              <p className="font-medium text-white">Nenhum vencimento próximo</p>
              <p className="mt-1 text-sm text-zinc-400">
                Não há parcelas em aberto vencendo nos próximos 5 dias.
              </p>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

function App() {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [profileSearch, setProfileSearch] = useState("");
  const [selectedProfile, setSelectedProfile] = useState("");
  const [data, setData] = useState({
    updatedAt: null,
    total: 0,
    filtered: 0,
    condominiums: [],
    statuses: [],
    teams: [],
    agreements: [],
  });
  const [allData, setAllData] = useState({
    updatedAt: null,
    total: 0,
    filtered: 0,
    condominiums: [],
    statuses: [],
    teams: [],
    agreements: [],
  });
  const [filters, setFilters] = useState({
    search: "",
    condominium: "",
    status: "",
    team: "",
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
    const result = await response.json();
    setData(result);
    if (!query) setAllData(result);
  }

  async function loadProfileBase() {
    const response = await fetch(`${API_URL}/api/agreements`);
    if (!response.ok) throw new Error("Nao foi possivel carregar a base de perfis.");
    setAllData(await response.json());
  }

  useEffect(() => {
    loadAgreements().catch((currentError) => setError(currentError.message));
  }, [query]);

  useEffect(() => {
    loadProfileBase().catch((currentError) => setError(currentError.message));
  }, []);

  async function handleImport() {
    setLoading(true);
    setError("");
    setFeedback("");

    try {
      const response = await fetch(`${API_URL}/api/import-from-storage`, {
        method: "POST",
      });
      const result = await readApiResponse(response, "Falha ao atualizar a base.");

      setFeedback(
        `Importação concluída: ${result.created} novos, ${result.updated} atualizados, ${result.total} no total.`
      );
      await Promise.all([loadAgreements(), loadProfileBase()]);
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
      const result = await readApiResponse(response, "Falha ao excluir os acordos.");

      setFeedback(`Exclusão concluída: ${result.deleted} acordos removidos.`);
      setDeleteConfirmation("");
      setDeleteOpen(false);
      setProfileSearch("");
      setSelectedProfile("");
      await Promise.all([loadAgreements(), loadProfileBase()]);
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
          const value = getInstallmentValue(agreement);
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
            summary.receivable += value;
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
          recoveryDaysWeightedSum: 0,
          recoveryValueWeight: 0,
          overdueDaysSum: 0,
          overdueDaysCount: 0,
          avgCompletionDays: 0,
          avgOverdueDays: 0,
        };

      current.total += 1;
      const status = agreement.effectiveStatus || agreement.status;

      if (status === "Recebido") {
        current.received += 1;
        current.recoveredValue += agreement.receivedValue || getInstallmentValue(agreement);
      }
      if (status === "Finalizado") current.finalized += 1;
      if (status === "Cancelado") current.canceled += 1;
      current.completed = current.received + current.finalized;

      const completionDays = daysBetween(agreement.agreementDate, agreement.receiptDate);
      if (completionDays !== null && (status === "Recebido" || status === "Finalizado")) {
        const recoveryWeight = agreement.receivedValue || getInstallmentValue(agreement);

        current.completionDaysSum += completionDays;
        current.completionDaysCount += 1;
        current.recoveryDaysWeightedSum += completionDays * recoveryWeight;
        current.recoveryValueWeight += recoveryWeight;
      }

      if (isOverdueAgreement(agreement, todayIso)) {
        const overdueDays = daysBetween(agreement.dueDate, todayIso);

        current.overdue += 1;
        current.receivable += getInstallmentValue(agreement);
        current.overdueDaysSum += overdueDays || 0;
        current.overdueDaysCount += 1;
      }

      byCondominium.set(key, current);
    });

    const rows = [...byCondominium.values()].map((row) => ({
      ...row,
      avgCompletionDays: row.recoveryValueWeight
        ? row.recoveryDaysWeightedSum / row.recoveryValueWeight
        : row.completionDaysCount
          ? row.completionDaysSum / row.completionDaysCount
          : 0,
      avgOverdueDays: row.overdueDaysCount ? row.overdueDaysSum / row.overdueDaysCount : 0,
      cancelRate: row.total ? row.canceled / row.total : null,
    }));
    const totals = rows.reduce(
      (summary, row) => ({
        total: summary.total + row.total,
        canceled: summary.canceled + row.canceled,
        overdue: summary.overdue + row.overdue,
        receivable: summary.receivable + row.receivable,
        recoveredValue: summary.recoveredValue + row.recoveredValue,
        completionDaysSum: summary.completionDaysSum + row.completionDaysSum,
        completionDaysCount: summary.completionDaysCount + row.completionDaysCount,
        recoveryDaysWeightedSum: summary.recoveryDaysWeightedSum + row.recoveryDaysWeightedSum,
        recoveryValueWeight: summary.recoveryValueWeight + row.recoveryValueWeight,
        overdueDaysSum: summary.overdueDaysSum + row.overdueDaysSum,
        overdueDaysCount: summary.overdueDaysCount + row.overdueDaysCount,
      }),
      {
        total: 0,
        canceled: 0,
        overdue: 0,
        receivable: 0,
        recoveredValue: 0,
        completionDaysSum: 0,
        completionDaysCount: 0,
        recoveryDaysWeightedSum: 0,
        recoveryValueWeight: 0,
        overdueDaysSum: 0,
        overdueDaysCount: 0,
      }
    );
    totals.avgCompletionDays = totals.recoveryValueWeight
      ? totals.recoveryDaysWeightedSum / totals.recoveryValueWeight
      : totals.completionDaysCount
      ? totals.completionDaysSum / totals.completionDaysCount
      : 0;
    totals.avgOverdueDays = totals.overdueDaysCount ? totals.overdueDaysSum / totals.overdueDaysCount : 0;
    totals.cancelRate = totals.total ? totals.canceled / totals.total : null;

    return {
      totals,
      totalCondominiums: rows.length,
      mostAgreements: [...rows].sort((a, b) => b.total - a.total).slice(0, 10),
      mostCompleted: [...rows].sort((a, b) => b.completed - a.completed).slice(0, 10),
      mostCanceled: [...rows].sort((a, b) => b.canceled - a.canceled).slice(0, 10),
      highestCancelRate: [...rows]
        .filter((row) => row.total)
        .sort((a, b) => b.cancelRate - a.cancelRate || b.canceled - a.canceled)
        .slice(0, 10),
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
                activeView === "profiles" ? "bg-white/[0.08] text-white" : "text-zinc-500"
              )}
              type="button"
              onClick={() => setActiveView("profiles")}
            >
              <UserRound size={17} aria-hidden="true" />
              Perfis
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
            <button
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition hover:bg-white/[0.05] hover:text-zinc-200",
                activeView === "dueDates" ? "bg-white/[0.08] text-white" : "text-zinc-500"
              )}
              type="button"
              onClick={() => setActiveView("dueDates")}
            >
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

              <Button disabled={loading} type="button" onClick={handleImport}>
                <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} />
                {loading ? "Atualizando" : "Atualizar base"}
              </Button>
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
                  onClick={() =>
                    setFilters({ search: "", condominium: "", status: "", team: "", dueFrom: "", dueTo: "" })
                  }
                >
                  <FilterX aria-hidden="true" />
                  Limpar
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <section className="grid items-end gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(240px,1.35fr)_minmax(190px,0.9fr)_minmax(150px,0.7fr)_minmax(105px,0.45fr)_minmax(155px,0.7fr)_minmax(155px,0.7fr)]">
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

                  <DropdownFilter
                    id="team"
                    label="Equipe"
                    options={data.teams}
                    value={filters.team}
                    onChange={(value) => setFilters((current) => ({ ...current, team: value }))}
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
            ) : activeView === "profiles" ? (
              <ProfilesView
                agreements={allData.agreements}
                search={profileSearch}
                onSearchChange={setProfileSearch}
                selectedProfile={selectedProfile}
                onSelectProfile={setSelectedProfile}
              />
            ) : activeView === "condominiums" ? (
              <section className="grid gap-4">
                <div>
                  <h2 className="text-xl font-semibold tracking-normal text-white">Condomínios</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Rankings por quantidade de acordos, conclusão, cancelamento e inadimplência.
                  </p>
                </div>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8" aria-label="Resumo de condomínios">
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
                    label="Tempo recuperação"
                    value={formatDays(condominiumRankings.totals.avgCompletionDays)}
                  />
                  <Metric
                    label="% cancelados"
                    value={formatPercentage(condominiumRankings.totals.cancelRate)}
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
                    title="Maior % de cancelados"
                    description="Cancelados sobre o total de parcelas/acordos do condomínio."
                    rows={condominiumRankings.highestCancelRate}
                    valueKey="cancelRate"
                    valueFormatter={formatPercentage}
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
                    title="Maior tempo de recuperação"
                    description="Dias entre data do acordo e recebimento, ponderado pelo valor recebido."
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
            ) : (
              <DueDatesView agreements={allData.agreements} />
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
