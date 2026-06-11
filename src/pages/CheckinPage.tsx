import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle, CheckCircle2, XCircle, RefreshCw, Phone, Banknote,
  Edit3, Trash2, Search, MapPin, Star, Eye, EyeOff, X, Copy, Check,
  ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';
import type { CheckinLead, StaffMember } from '../types';
import { api } from '../api/client';
import { FilterDatePicker, PortalSelect } from '../components/ui';

interface Props {
  currentUser: StaffMember;
  onRefreshLeads: () => Promise<void>;
  onEditLead?: (lead: CheckinLead) => void;
  allUsers?: StaffMember[];
}

const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const PAGE_SIZE = 30;

function fmtDate(raw: string): string {
  const d = new Date(raw);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

function fmtDateShort(raw: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fmtCreatedAt(raw: string): string {
  if (!raw) return '';
  const d = new Date(raw);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function fmtDateYcl(raw: string): string {
  if (!raw) return '';
  const parts = raw.split(' ');
  const [year, month, day] = (parts[0] || '').split('-').map(Number);
  const timePart = parts[1] || '';
  const [hh, mm] = timePart.split(':').map(Number);
  if (!year || !month || !day) return raw.slice(0, 10);
  const time = timePart ? ` ${String(hh || 0).padStart(2, '0')}:${String(mm || 0).padStart(2, '0')}` : '';
  return `${day} ${MONTHS[month - 1]}${time}`;
}

function mskDateStr(offsetDays: number): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function daysAgo(raw: string): string {
  const todayMsk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  todayMsk.setHours(0, 0, 0, 0);
  const date = new Date(raw);
  const bookDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diff = Math.floor((todayMsk.getTime() - bookDay.getTime()) / 86_400_000);
  if (diff === 1) return 'вчера';
  if (diff === 0) return 'сегодня';
  if (diff <= 4) return `${diff} дня`;
  return `${diff} дн`;
}

function fmtPhone(p: string): string {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 11) return `+7 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7,9)}-${d.slice(9,11)}`;
  return p;
}

function fmtMoney(n: number): string {
  return n.toLocaleString('ru') + '\u00a0₽';
}

type YclientsFilter = 'all' | 'no_data' | 'waiting' | 'confirmed' | 'showed' | 'no_show_ycl' | 'deleted';
type DepositFilter  = 'all' | 'paid' | 'not_paid' | 'no_deposit';

const RECORD_STATUS: Record<string, { text: string; cls: string }> = {
  booked:      { text: 'Запись',     cls: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  rescheduled: { text: 'Перенос',    cls: 'bg-amber-50 text-amber-600 border-amber-200'   },
  showed_up:   { text: 'Пришёл ✓',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  no_show:     { text: 'Не пришёл', cls: 'bg-rose-50 text-rose-600 border-rose-200'       },
  cancelled:   { text: 'Отменено',  cls: 'bg-neutral-100 text-neutral-500 border-neutral-200' },
};

function yclLabel(att: number | null, deleted?: boolean | null, hasOther?: boolean) {
  if (deleted) return { text: 'Удалено',        cls: 'text-neutral-500', dot: 'bg-neutral-400' };
  switch (att) {
    case  1: return { text: 'Пришёл',           cls: 'text-emerald-700', dot: 'bg-emerald-500' };
    case -1: return { text: 'Не пришёл',        cls: 'text-rose-700',    dot: 'bg-rose-500'    };
    case  0: return { text: 'Ожидание',         cls: 'text-amber-700',   dot: 'bg-amber-400'   };
    case  2: return { text: 'Подтвердил',       cls: 'text-indigo-700',  dot: 'bg-indigo-500'  };
    default:
      if (hasOther) return { text: 'Перенесена',      cls: 'text-amber-600',   dot: 'bg-amber-400'   };
      return            { text: 'Запись не найдена', cls: 'text-neutral-400', dot: 'bg-neutral-300' };
  }
}

function PillGroup<T extends string>({
  value, onChange, options,
}: {
  value: T; onChange: (v: T) => void; options: { id: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar">
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer whitespace-nowrap select-none border ${
            value === o.id
              ? 'bg-neutral-950 text-white border-neutral-950'
              : 'bg-white/60 text-neutral-500 border-neutral-200/70 hover:text-neutral-800 hover:bg-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CopyAmoId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex items-center gap-1 group">
      <a
        href={`https://wuuuu.amocrm.ru/leads/detail/${id}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-700 transition-colors font-medium"
      >
        <span className="text-[8px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded leading-none">AmoCRM</span>
        <span className="font-mono">{id}</span>
        <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
      <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-0.5" title="Скопировать ID">
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-neutral-400" />}
      </button>
    </div>
  );
}

function CopyPhoneCheckin({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(phone).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div className="flex items-center gap-1 group">
      <a href={`tel:${phone}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-800 transition-colors font-medium">
        <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
        {fmtPhone(phone)}
      </a>
      <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ml-0.5" title="Скопировать номер">
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-neutral-400" />}
      </button>
    </div>
  );
}

export default function CheckinPage({ currentUser, onRefreshLeads, onEditLead, allUsers = [], leadSaveSignal }: Props) {
  const [items, setItems]         = useState<CheckinLead[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [fading, setFading]       = useState<Set<string>>(new Set());

  const [searchInput, setSearchInput]     = useState('');
  const [search, setSearch]               = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');
  const [ycFilter, setYcFilter]           = useState<YclientsFilter>('all');
  const [depFilter, setDepFilter]         = useState<DepositFilter>('all');
  const [cityFilter, setCityFilter]       = useState('all');
  const [showChecked, setShowChecked]     = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [page, setPage]         = useState(1);
  const [showAll, setShowAll]   = useState(false);

  const isAdmin = currentUser.role === 'admin';

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.checkin.list(currentUser.name, currentUser.role);
      setItems(data);
      setDismissed(new Set());
      setFading(new Set());
    } catch { /* ignore */ }
    setLoading(false);
  }, [currentUser.name, currentUser.role]);

  const fetchItemsSilent = useCallback(async () => {
    try {
      const data = await api.checkin.list(currentUser.name, currentUser.role);
      setItems(data);
    } catch { /* ignore */ }
  }, [currentUser.name, currentUser.role]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    const handler = () => fetchItemsSilent();
    window.addEventListener('viviapp:lead-saved', handler);
    return () => window.removeEventListener('viviapp:lead-saved', handler);
  }, [fetchItemsSilent]);

  const handleStatus = async (id: string, status: 'showed_up' | 'no_show') => {
    setBusy(p => new Set(p).add(id));
    try {
      await api.checkin.quickUpdate(id, { status });
      setFading(p => new Set(p).add(id));
      setTimeout(() => {
        setDismissed(p => new Set(p).add(id));
        setFading(p => { const s = new Set(p); s.delete(id); return s; });
      }, 500);
      setSelected(p => { const s = new Set(p); s.delete(id); return s; });
      await onRefreshLeads();
      await fetchItems();
    } catch { /* ignore */ }
    setBusy(p => { const s = new Set(p); s.delete(id); return s; });
  };

  const [deleteBusy, setDeleteBusy] = useState<Set<string>>(new Set());

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту запись?')) return;
    setDeleteBusy(p => new Set(p).add(id));
    try {
      await api.leads.delete(id);
      setDismissed(p => new Set(p).add(id));
      await onRefreshLeads();
      await fetchItems();
    } catch { /* ignore */ }
    setDeleteBusy(p => { const s = new Set(p); s.delete(id); return s; });
  };

  const handleBulkStatus = async (status: 'showed_up' | 'no_show') => {
    setBulkBusy(true);
    const ids = Array.from(selected);
    await Promise.all(ids.map(id => api.checkin.quickUpdate(id, { status }).catch(() => {})));
    ids.forEach(id => setFading(p => new Set(p).add(id)));
    setTimeout(() => {
      ids.forEach(id => setDismissed(p => new Set(p).add(id)));
      setFading(new Set());
    }, 500);
    setSelected(new Set());
    await onRefreshLeads();
    await fetchItems();
    setBulkBusy(false);
  };

  const uniqueManagers = useMemo(() =>
    Array.from(new Set(items.map(l => l.managerName).filter(Boolean))).sort(),
    [items]
  );

  const uniqueCities = useMemo(() =>
    Array.from(new Set(items.map(l => l.city).filter(Boolean))).sort() as string[],
    [items]
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return items.filter(l => {
      if (dismissed.has(l.id ?? '')) return false;
      if (!showChecked && (l.status === 'showed_up' || l.status === 'no_show' || l.status === 'cancelled')) return false;
      if (term && !(
        l.clientName.toLowerCase().includes(term) ||
        (l.clientPhone && l.clientPhone.includes(term)) ||
        (l.amocrmLeadId && l.amocrmLeadId.toLowerCase().includes(term))
      )) return false;
      if (managerFilter !== 'all' && l.managerName !== managerFilter) return false;
      if (cityFilter !== 'all' && l.city !== cityFilter) return false;
      const bd = String(l.bookingDate).slice(0, 10);
      if (dateFrom && bd < dateFrom) return false;
      if (dateTo   && bd > dateTo)   return false;
      if (ycFilter !== 'all') {
        if (ycFilter === 'deleted'     && !l.yclientsDeleted)                                    return false;
        if (ycFilter === 'no_data'     && (l.yclientsDeleted || l.yclientsAttendance !== null))  return false;
        if (ycFilter === 'waiting'     && (l.yclientsDeleted || l.yclientsAttendance !== 0))     return false;
        if (ycFilter === 'confirmed'   && (l.yclientsDeleted || l.yclientsAttendance !== 2))     return false;
        if (ycFilter === 'showed'      && (l.yclientsDeleted || l.yclientsAttendance !== 1))     return false;
        if (ycFilter === 'no_show_ycl' && (l.yclientsDeleted || l.yclientsAttendance !== -1))   return false;
      }
      const hasPo = !!l.yookassaPaid || !!l.yclientsStudioPo;
      if (depFilter === 'paid'       && !hasPo)               return false;
      if (depFilter === 'not_paid'   && hasPo)                return false;
      if (depFilter === 'no_deposit' && (hasPo || l.depositRequired)) return false;
      return true;
    });
  }, [items, dismissed, search, managerFilter, cityFilter, dateFrom, dateTo, ycFilter, depFilter, showChecked]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, managerFilter, cityFilter, dateFrom, dateTo, ycFilter, depFilter, showChecked]);

  const paginated = useMemo(() =>
    showAll ? filtered : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page, showAll]
  );

  const hasFilters = !!(search || searchInput || managerFilter !== 'all' || cityFilter !== 'all' || dateFrom || dateTo || ycFilter !== 'all' || depFilter !== 'all');

  const resetFilters = () => {
    setSearchInput(''); setSearch('');
    setManagerFilter('all');
    setCityFilter('all');
    setDateFrom(''); setDateTo('');
    setYcFilter('all');
    setDepFilter('all');
  };

  const pendingOnPage = paginated.filter(l =>
    (l.status === 'booked' || l.status === 'rescheduled') && !dismissed.has(l.id ?? '')
  );

  const allPageSelected = pendingOnPage.length > 0 && pendingOnPage.every(l => selected.has(l.id ?? ''));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelected(p => {
        const s = new Set(p);
        pendingOnPage.forEach(l => s.delete(l.id ?? ''));
        return s;
      });
    } else {
      setSelected(p => {
        const s = new Set(p);
        pendingOnPage.forEach(l => s.add(l.id ?? ''));
        return s;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-display font-bold text-neutral-950 uppercase tracking-widest">
            Проверка визитов
          </h2>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">
            {filtered.length === 0
              ? 'Записей нет'
              : `${filtered.length} ${filtered.length === 1 ? 'запись' : filtered.length < 5 ? 'записи' : 'записей'}`}
            {totalPages > 1 && ` · стр. ${page}/${totalPages}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowChecked(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer ${
                showChecked
                  ? 'bg-neutral-950 text-white border-neutral-950'
                  : 'bg-white/60 text-neutral-500 border-neutral-200/70 hover:bg-white hover:text-neutral-800'
              }`}
            >
              {showChecked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {showChecked ? 'Все статусы' : 'Только ожидающие'}
            </button>
          )}
          <button
            onClick={fetchItems}
            className="p-2.5 rounded-xl bg-white/50 border border-neutral-200/60 hover:bg-white transition-colors duration-150 shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="spatial-glass rounded-2xl p-4 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Клиент, телефон, номер AmoCRM..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white/50 focus:bg-white/90 border border-neutral-200/60 text-neutral-850 placeholder-neutral-400 rounded-xl focus:outline-hidden focus:border-neutral-400 transition-all duration-200 font-semibold shadow-3xs"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); setSearch(''); }} className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer">
              <X className="w-3.5 h-3.5 text-neutral-400 hover:text-neutral-700" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Вчера',  from: mskDateStr(-1), to: mskDateStr(-1) },
            { label: 'Неделя', from: mskDateStr(-7), to: mskDateStr(0)  },
            { label: 'Месяц',  from: mskDateStr(-30),to: mskDateStr(0)  },
          ].map(p => {
            const active = dateFrom === p.from && dateTo === p.to;
            return (
              <button
                key={p.label}
                onClick={() => active ? (setDateFrom(''), setDateTo('')) : (setDateFrom(p.from), setDateTo(p.to))}
                className={`text-[10px] font-bold px-3 py-2 border rounded-xl transition-colors duration-150 cursor-pointer shrink-0 ${
                  active ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white/60 text-neutral-500 border-neutral-200/70 hover:bg-white hover:text-neutral-800'
                }`}
              >{p.label}</button>
            );
          })}
          <FilterDatePicker
            label="Период"
            valueFrom={dateFrom}
            valueTo={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t); }}
          />
          {isAdmin && (
            <PortalSelect
              value={managerFilter}
              onChange={setManagerFilter}
              options={uniqueManagers.map(m => ({ value: m, label: m }))}
              allLabel="Все менеджеры"
              allValue="all"
            />
          )}
          {uniqueCities.length > 0 && (
            <PortalSelect
              value={cityFilter}
              onChange={setCityFilter}
              options={uniqueCities.map(c => ({ value: c, label: c }))}
              allLabel="Все города"
              allValue="all"
            />
          )}
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto text-[9.5px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-800 transition-colors px-3 py-2 border border-neutral-200/60 rounded-xl bg-white/50 cursor-pointer"
            >
              Сбросить
            </button>
          )}
        </div>

        <PillGroup<YclientsFilter>
          value={ycFilter}
          onChange={setYcFilter}
          options={[
            { id: 'all',         label: 'Yclients: все' },
            { id: 'no_data',     label: 'Нет данных' },
            { id: 'waiting',     label: 'Ожидание' },
            { id: 'confirmed',   label: 'Подтвердил' },
            { id: 'showed',      label: 'Пришёл' },
            { id: 'no_show_ycl', label: 'Не пришёл' },
            { id: 'deleted',     label: 'Удалено' },
          ]}
        />

        <PillGroup<DepositFilter>
          value={depFilter}
          onChange={setDepFilter}
          options={[
            { id: 'all',        label: 'Оплата: все' },
            { id: 'paid',       label: 'Оплачена' },
            { id: 'not_paid',   label: 'Не оплачена' },
            { id: 'no_deposit', label: 'Без предоплаты' },
          ]}
        />
      </div>

      {/* Bulk actions bar */}
      {isAdmin && selected.size > 0 && (
        <div className="spatial-glass rounded-xl px-4 py-3 flex items-center gap-3 border border-neutral-200/60">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mr-auto">
            Выбрано: {selected.size}
          </span>
          <button
            disabled={bulkBusy}
            onClick={() => handleBulkStatus('showed_up')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl cursor-pointer transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Все пришли
          </button>
          <button
            disabled={bulkBusy}
            onClick={() => handleBulkStatus('no_show')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] font-bold uppercase tracking-widest rounded-xl cursor-pointer transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle className="w-3.5 h-3.5" /> Не пришли
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="p-2 rounded-xl bg-white/60 border border-neutral-200 hover:bg-neutral-100 text-neutral-400 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Select all on page (admin, pending items exist) */}
      {isAdmin && pendingOnPage.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${allPageSelected ? 'bg-neutral-950 border-neutral-950' : 'bg-white border-neutral-300'}`}>
              {allPageSelected && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            {allPageSelected ? 'Снять выделение' : `Выбрать всех на странице (${pendingOnPage.length})`}
          </button>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-150 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-neutral-300" />
          </div>
          <p className="text-xs font-bold text-neutral-800 uppercase tracking-widest">
            {hasFilters ? 'Записей по фильтру нет' : 'Все визиты проверены'}
          </p>
          <p className="text-[10px] text-neutral-400 font-medium">
            {hasFilters ? 'Попробуйте изменить параметры фильтра' : 'Записи с прошедшей датой отмечены'}
          </p>
        </div>
      )}

      {/* Cards */}
      <div className="flex flex-col gap-2.5">
        {paginated.map(lead => {
          const id       = lead.id ?? '';
          const isBusy   = busy.has(id);
          const isFading = fading.has(id);
          const noDataOnDate = lead.yclientsAttendance === null && !lead.yclientsDeleted;
          const showOtherDate = (noDataOnDate || lead.yclientsDeleted || lead.yclientsAttendance === -1) && !!lead.yclientsOtherDate;
          const ycl      = yclLabel(lead.yclientsAttendance, lead.yclientsDeleted, !!lead.yclientsOtherDate && noDataOnDate);
          const isPending = lead.status === 'booked' || lead.status === 'rescheduled';
          const recordSt  = RECORD_STATUS[lead.status] ?? RECORD_STATUS['booked'];
          const isSelected = selected.has(id);

          const services     = Array.isArray(lead.yclientsServices) ? lead.yclientsServices : [];
          const paidServices = services.filter(sv => sv != null && (sv.paid ?? 0) > 0);
          const totalPaid    = paidServices.reduce((s, sv) => s + (sv.paid ?? 0), 0);
          const hasYcl       = lead.yclientsAttendance !== null || lead.yclientsDeleted || lead.yclientsDate || lead.yclientsOtherDate;

          return (
            <div
              key={id}
              className={`spatial-glass rounded-xl p-4 flex flex-col gap-3 transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'} ${isSelected ? 'ring-1 ring-neutral-950/20' : ''}`}
            >
              {/* Row 1: meta */}
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                {/* Checkbox (admin + pending only) */}
                {isAdmin && isPending && (
                  <button
                    onClick={() => setSelected(p => {
                      const s = new Set(p);
                      s.has(id) ? s.delete(id) : s.add(id);
                      return s;
                    })}
                    className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center transition-colors cursor-pointer ${isSelected ? 'bg-neutral-950 border-neutral-950' : 'bg-white border-neutral-300 hover:border-neutral-500'}`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>
                )}

                {/* Booking date */}
                <span className="text-[10px] font-bold text-neutral-700 whitespace-nowrap">
                  {fmtDateShort(String(lead.bookingDate))}
                </span>

                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border whitespace-nowrap ${recordSt.cls}`}>
                  {recordSt.text}
                </span>

                {/* Created date — always visible */}
                {lead.createdAt && (
                  <span className="text-[9px] text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded font-medium whitespace-nowrap">
                    созд. {fmtCreatedAt(lead.createdAt)}
                  </span>
                )}

                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                    {lead.managerName}
                  </span>
                  {onEditLead && (
                    <button
                      onClick={() => onEditLead(lead)}
                      className="p-1.5 rounded-lg bg-white/70 border border-neutral-200 hover:bg-neutral-950 hover:text-white hover:border-neutral-950 text-neutral-400 cursor-pointer transition-colors duration-150"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      disabled={deleteBusy.has(id)}
                      onClick={() => handleDelete(id)}
                      className="p-1.5 rounded-lg bg-white/70 border border-neutral-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-neutral-400 cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: client */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-display font-bold text-neutral-950 text-sm leading-snug">
                  {lead.clientName}
                  {lead.isReferral && <Star className="inline w-3 h-3 text-amber-400 ml-1.5 mb-0.5" />}
                </span>
                {lead.clientPhone && <CopyPhoneCheckin phone={lead.clientPhone} />}
                {lead.city && (
                  <span className="flex items-center gap-1 text-[10px] text-neutral-400 font-medium">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {lead.city}
                  </span>
                )}
                {lead.amocrmLeadId && <CopyAmoId id={lead.amocrmLeadId} />}
              </div>

              {/* Row 3: Yclients + payment */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Yclients status */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${
                  lead.yclientsDeleted          ? 'bg-neutral-50 border border-neutral-200' :
                  lead.yclientsAttendance === 1  ? 'bg-emerald-50 border border-emerald-200' :
                  lead.yclientsAttendance === -1 ? 'bg-rose-50 border border-rose-200' :
                  lead.yclientsAttendance === 2  ? 'bg-indigo-50 border border-indigo-200' :
                  lead.yclientsAttendance === 0  ? 'bg-amber-50 border border-amber-200' :
                  noDataOnDate && lead.yclientsOtherDate ? 'bg-amber-50 border border-amber-200' :
                  'bg-neutral-50 border border-neutral-100'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ycl.dot}`} />
                  <span className={ycl.cls}>{ycl.text}</span>
                  {!noDataOnDate && lead.yclientsStaff && (
                    <span className="text-neutral-400 font-medium">· {lead.yclientsStaff}</span>
                  )}
                  {!noDataOnDate && lead.yclientsDate && (
                    <span className="text-neutral-400 font-medium ml-1">{fmtDateYcl(lead.yclientsDate)}</span>
                  )}
                  {showOtherDate && (
                    <>
                      <span className="text-neutral-300 mx-0.5">·</span>
                      <span className="text-neutral-500 font-medium">→ {fmtDateYcl(lead.yclientsOtherDate!)}</span>
                    </>
                  )}
                </div>

                {/* Paid services */}
                {paidServices.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {paidServices.map((svc, i) => (
                      <span key={i} className="text-[10px] text-neutral-600 bg-white/70 border border-neutral-200 px-2 py-1 rounded-lg font-medium">
                        {svc.name} — {fmtMoney(svc.paid!)}
                      </span>
                    ))}
                    {paidServices.length > 1 && (
                      <span className="text-[10px] font-bold text-neutral-700 bg-neutral-100 px-2 py-1 rounded-lg border border-neutral-200">
                        {fmtMoney(totalPaid)}
                      </span>
                    )}
                  </div>
                )}

                {/* Payment badge */}
                {lead.yookassaPaid && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border bg-violet-50 text-violet-700 border-violet-200">
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                    {lead.yookassaAmount ? `ПО ${fmtMoney(lead.yookassaAmount)}` : 'ПО внесена'}
                  </span>
                )}
                {lead.yclientsStudioPo && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border bg-teal-50 text-teal-700 border-teal-200">
                    <span className="w-1.5 h-1.5 bg-teal-500 rounded-full" />
                    {lead.yclientsStudioPoAmount ? `ПО в студии ${fmtMoney(lead.yclientsStudioPoAmount)}` : 'ПО в студии'}
                  </span>
                )}
                {!lead.yookassaPaid && !lead.yclientsStudioPo && lead.depositRequired && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border bg-orange-50 text-orange-600 border-orange-200">
                    <Banknote className="w-3 h-3" />
                    ПО не поступала
                  </span>
                )}

                {lead.visitCost && lead.visitCost !== 2090 && (
                  <span className="text-[10px] font-medium px-2.5 py-1.5 rounded-lg border bg-neutral-50 text-neutral-500 border-neutral-200/50">
                    Визит: {fmtMoney(lead.visitCost)}
                  </span>
                )}
              </div>

              {/* Comments */}
              {lead.comments && (
                <p className="text-[10.5px] text-neutral-500 leading-relaxed bg-neutral-50/70 px-3 py-2 rounded-lg border border-neutral-100">
                  <span className="font-bold text-[8.5px] uppercase tracking-wider text-neutral-400 mr-2">Примечание:</span>
                  {lead.comments}
                </p>
              )}

              {/* Action buttons */}
              {isAdmin && isPending && (
                <div className="flex gap-2 pt-0.5">
                  <button
                    disabled={isBusy}
                    onClick={() => handleStatus(id, 'showed_up')}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 bg-emerald-500 hover:bg-emerald-400 text-white"
                  >
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    Пришёл
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => handleStatus(id, 'no_show')}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 bg-neutral-100 hover:bg-rose-50 text-neutral-600 hover:text-rose-600 border border-neutral-200/60 hover:border-rose-200"
                  >
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    Не пришёл
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex flex-col items-center gap-3 pt-1">
          {/* Show all toggle */}
          <button
            onClick={() => setShowAll(v => !v)}
            className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl border transition-colors duration-150 cursor-pointer ${
              showAll
                ? 'bg-neutral-950 text-white border-neutral-950'
                : 'bg-white/60 text-neutral-500 border-neutral-200/70 hover:bg-white hover:text-neutral-800'
            }`}
          >
            {showAll ? `Постранично (${PAGE_SIZE}/стр.)` : `Показать все (${filtered.length})`}
          </button>

          {/* Page controls — only when not showing all */}
          {!showAll && totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-xl border border-neutral-200/60 bg-white/60 hover:bg-neutral-950 hover:text-white text-neutral-600 transition duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p =>
                  p === 1 || p === totalPages || Math.abs(p - page) <= 2
                ).reduce<(number | '…')[]>((acc, p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, []).map((p, i) =>
                  p === '…'
                    ? <span key={`ellipsis-${i}`} className="px-2 text-neutral-400 text-xs">…</span>
                    : <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-colors duration-150 cursor-pointer ${
                          page === p ? 'bg-neutral-950 text-white' : 'bg-white/60 text-neutral-500 border border-neutral-200/70 hover:bg-white hover:text-neutral-800'
                        }`}
                      >{p}</button>
                )}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-xl border border-neutral-200/60 bg-white/60 hover:bg-neutral-950 hover:text-white text-neutral-600 transition duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
