import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle, XCircle, RefreshCw, Phone, Banknote,
  Edit3, Search, MapPin, Star, Eye, EyeOff, X,
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

function fmtDate(raw: string): string {
  const d = new Date(raw);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fmtDateYcl(raw: string): string {
  // raw is "2026-04-20 17:50:00" from DB (no timezone — Moscow time)
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
  if (diff <= 4) return `${diff} дня назад`;
  return `${diff} дней назад`;
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
  booked:      { text: 'Запись',      cls: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  rescheduled: { text: 'Перенос',     cls: 'bg-amber-50 text-amber-600 border-amber-200'   },
  showed_up:   { text: 'Пришёл ✓',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  no_show:     { text: 'Не пришёл',  cls: 'bg-rose-50 text-rose-600 border-rose-200'       },
  cancelled:   { text: 'Отменено',   cls: 'bg-neutral-100 text-neutral-500 border-neutral-200' },
};

function yclLabel(att: number | null, deleted?: boolean | null) {
  if (deleted) return { text: 'Удалено',            cls: 'text-neutral-500', dot: 'bg-neutral-400' };
  switch (att) {
    case  1: return { text: 'Пришёл',             cls: 'text-emerald-700', dot: 'bg-emerald-500' };
    case -1: return { text: 'Не пришёл',          cls: 'text-rose-700',    dot: 'bg-rose-500'    };
    case  0: return { text: 'Ожидание',           cls: 'text-amber-700',   dot: 'bg-amber-400'   };
    case  2: return { text: 'Подтвердил запись',  cls: 'text-indigo-700',  dot: 'bg-indigo-500'  };
    default: return { text: 'Нет данных Yclients', cls: 'text-neutral-400', dot: 'bg-neutral-300' };
  }
}

function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
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

export default function CheckinPage({ currentUser, onRefreshLeads, onEditLead, allUsers = [] }: Props) {
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
  const [showChecked, setShowChecked]     = useState(false);

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

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleStatus = async (id: string, status: 'showed_up' | 'no_show') => {
    setBusy(p => new Set(p).add(id));
    try {
      await api.checkin.quickUpdate(id, { status });
      setFading(p => new Set(p).add(id));
      setTimeout(() => {
        setDismissed(p => new Set(p).add(id));
        setFading(p => { const s = new Set(p); s.delete(id); return s; });
      }, 500);
      await onRefreshLeads();
      await fetchItems();
    } catch { /* ignore */ }
    setBusy(p => { const s = new Set(p); s.delete(id); return s; });
  };

  const uniqueManagers = useMemo(() =>
    Array.from(new Set(items.map(l => l.managerName).filter(Boolean))).sort(),
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
        (l.amocrmLeadId && l.amocrmLeadId.toLowerCase().includes(term)) ||
        (l.clientName.toLowerCase().includes(term))
      )) return false;

      if (managerFilter !== 'all' && l.managerName !== managerFilter) return false;

      const bd = String(l.bookingDate).slice(0, 10);
      if (dateFrom && bd < dateFrom) return false;
      if (dateTo   && bd > dateTo)   return false;

      if (ycFilter !== 'all') {
        if (ycFilter === 'deleted'     && !l.yclientsDeleted)                                                return false;
        if (ycFilter === 'no_data'     && (l.yclientsDeleted || l.yclientsAttendance !== null))             return false;
        if (ycFilter === 'waiting'     && (l.yclientsDeleted || l.yclientsAttendance !== 0))                return false;
        if (ycFilter === 'confirmed'   && (l.yclientsDeleted || l.yclientsAttendance !== 2))                return false;
        if (ycFilter === 'showed'      && (l.yclientsDeleted || l.yclientsAttendance !== 1))                return false;
        if (ycFilter === 'no_show_ycl' && (l.yclientsDeleted || l.yclientsAttendance !== -1))              return false;
      }

      if (depFilter === 'paid'       && !l.yookassaPaid)   return false;
      if (depFilter === 'not_paid'   && !!l.yookassaPaid)  return false;
      if (depFilter === 'no_deposit' && !!l.yookassaPaid)  return false;

      return true;
    });
  }, [items, dismissed, search, managerFilter, dateFrom, dateTo, ycFilter, depFilter, showChecked]);

  const hasFilters = !!(search || searchInput || managerFilter !== 'all' || dateFrom || dateTo || ycFilter !== 'all' || depFilter !== 'all');

  const resetFilters = () => {
    setSearchInput(''); setSearch('');
    setManagerFilter('all');
    setDateFrom(''); setDateTo('');
    setYcFilter('all');
    setDepFilter('all');
  };

  const pendingCount = filtered.filter(l =>
    !l.yclientsDeleted && l.yclientsAttendance !== 1 && l.yclientsAttendance !== -1
    && l.status !== 'showed_up' && l.status !== 'no_show'
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-display font-bold text-neutral-950 uppercase tracking-widest">
            Проверка визитов
          </h2>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">
            {filtered.length === 0
              ? 'Записей нет'
              : `${filtered.length} ${filtered.length === 1 ? 'запись' : filtered.length < 5 ? 'записи' : 'записей'}`
                + (pendingCount > 0 ? ` · ${pendingCount} ожидают` : '')}
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

        {/* Search */}
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

        {/* Date presets + range */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick presets */}
          {[
            { label: 'Вчера',   from: mskDateStr(-1), to: mskDateStr(-1) },
            { label: 'Неделя',  from: mskDateStr(-7), to: mskDateStr(0)  },
            { label: 'Месяц',   from: mskDateStr(-30),to: mskDateStr(0)  },
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

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto text-[9.5px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-800 transition-colors px-3 py-2 border border-neutral-200/60 rounded-xl bg-white/50 cursor-pointer"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Yclients status pills */}
        <PillGroup<YclientsFilter>
          value={ycFilter}
          onChange={setYcFilter}
          options={[
            { id: 'all',         label: 'Yclients: все' },
            { id: 'no_data',     label: 'Нет данных' },
            { id: 'waiting',     label: 'Ожидание' },
            { id: 'confirmed',   label: 'Подтвердил' },
            { id: 'showed',      label: 'Пришёл ↗' },
            { id: 'no_show_ycl', label: 'Не пришёл ↗' },
            { id: 'deleted',     label: 'Удалено ↗' },
          ]}
        />

        {/* Deposit pills */}
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

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-20 space-y-3">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(lead => {
          const id       = lead.id ?? '';
          const isBusy   = busy.has(id);
          const isFading = fading.has(id);
          const ycl      = yclLabel(lead.yclientsAttendance, lead.yclientsDeleted);
          const hasSuggestion = !lead.yclientsDeleted && (lead.yclientsAttendance === 1 || lead.yclientsAttendance === -1);
          const isPending = lead.status === 'booked' || lead.status === 'rescheduled';
          const recordSt  = RECORD_STATUS[lead.status] ?? RECORD_STATUS['booked'];

          const services     = lead.yclientsServices ?? [];
          const paidServices = services.filter(sv => (sv.paid ?? 0) > 0);
          const totalPaid    = paidServices.reduce((s, sv) => s + sv.paid!, 0);
          const hasYcl    = lead.yclientsAttendance !== null || lead.yclientsDeleted || lead.yclientsDate;

          return (
            <div
              key={id}
              className={`spatial-glass rounded-2xl p-5 flex flex-col gap-4 transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-neutral-700 uppercase tracking-wider whitespace-nowrap">
                    {fmtDate(lead.bookingDate)}
                  </span>
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                    {daysAgo(lead.bookingDate)}
                  </span>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border whitespace-nowrap ${recordSt.cls}`}>
                    {recordSt.text}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider truncate max-w-[80px]">
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
                </div>
              </div>

              {/* Client info */}
              <div className="space-y-1.5">
                <p className="font-display font-bold text-neutral-950 text-base leading-snug tracking-tight">
                  {lead.clientName}
                  {lead.isReferral && (
                    <Star className="inline w-3.5 h-3.5 text-amber-400 ml-2 mb-0.5" />
                  )}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {lead.clientPhone && (
                    <a href={`tel:${lead.clientPhone}`} className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-800 transition-colors font-medium">
                      <Phone className="w-3 h-3 text-neutral-400 shrink-0" />
                      {fmtPhone(lead.clientPhone)}
                    </a>
                  )}
                  {lead.city && (
                    <span className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {lead.city}
                    </span>
                  )}
                  {lead.amocrmLeadId && (
                    <span className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
                      <span className="text-[8px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-400 px-1.5 py-0.5 rounded leading-none">AmoCRM</span>
                      <span className="font-mono select-all">#{lead.amocrmLeadId}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Yclients section */}
              <div className={`rounded-xl border overflow-hidden ${hasYcl ? 'border-neutral-200' : 'border-neutral-100'}`}>
                {/* Attendance row */}
                <div className={`flex items-center justify-between gap-2 px-3.5 py-2.5 ${
                  lead.yclientsDeleted          ? 'bg-neutral-50' :
                  lead.yclientsAttendance === 1  ? 'bg-emerald-50' :
                  lead.yclientsAttendance === -1 ? 'bg-rose-50' :
                  lead.yclientsAttendance === 2  ? 'bg-indigo-50' :
                  lead.yclientsAttendance === 0  ? 'bg-amber-50' :
                  'bg-neutral-50/50'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${ycl.dot}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${ycl.cls}`}>{ycl.text}</span>
                    {lead.yclientsStaff && (
                      <span className="text-[9px] text-neutral-400 font-medium">· {lead.yclientsStaff}</span>
                    )}
                  </div>
                  {lead.yclientsDate && (
                    <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                      {fmtDateYcl(lead.yclientsDate)}
                    </span>
                  )}
                  {hasSuggestion && !lead.status.startsWith('showed') && !lead.status.startsWith('no') && (
                    <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400 shrink-0">Подтвердить</span>
                  )}
                </div>

                {/* Paid services only */}
                {paidServices.length > 0 && (
                  <div className="border-t border-neutral-100 bg-white/50 px-3.5 py-2 space-y-0.5">
                    {paidServices.map((svc, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-neutral-500 leading-tight truncate">{svc.name}</span>
                        <span className="text-[10px] font-semibold text-neutral-700 shrink-0">{fmtMoney(svc.paid!)}</span>
                      </div>
                    ))}
                    {paidServices.length > 1 && (
                      <div className="flex items-center justify-between pt-1 mt-0.5 border-t border-neutral-100">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Итого</span>
                        <span className="text-[11px] font-bold text-neutral-800">{fmtMoney(totalPaid)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment row */}
              <div className="flex flex-wrap gap-2">
                {lead.yookassaPaid ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border bg-violet-50 text-violet-700 border-violet-200">
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                    {lead.yookassaAmount ? `Предоплата ${fmtMoney(lead.yookassaAmount)}` : 'Предоплата внесена'}
                  </span>
                ) : lead.depositRequired ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border bg-orange-50 text-orange-600 border-orange-200">
                    <Banknote className="w-3 h-3" />
                    Предоплата не поступала
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-medium rounded-lg border bg-neutral-50 text-neutral-400 border-neutral-200/50">
                    Без предоплаты
                  </span>
                )}
                {lead.visitCost && lead.visitCost !== 2090 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-medium rounded-lg border bg-neutral-50 text-neutral-500 border-neutral-200/50">
                    Визит: {fmtMoney(lead.visitCost)}
                  </span>
                )}
              </div>

              {/* Comments */}
              {lead.comments && (
                <div className="bg-neutral-50/70 px-3.5 py-2.5 rounded-xl border border-neutral-150/45 text-[11px] text-neutral-500 leading-relaxed shadow-3xs">
                  <span className="font-bold text-[8.5px] uppercase tracking-wider text-neutral-400 mr-2">Примечание:</span>
                  {lead.comments}
                </div>
              )}

              {/* Action buttons — admin only, only for pending records */}
              {isAdmin && isPending && (
                <div className="flex gap-2 pt-0.5">
                  <button
                    disabled={isBusy}
                    onClick={() => handleStatus(id, 'showed_up')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 bg-emerald-500 hover:bg-emerald-400 text-white"
                  >
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    Пришёл
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => handleStatus(id, 'no_show')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 bg-neutral-100 hover:bg-rose-50 text-neutral-600 hover:text-rose-600 border border-neutral-200/60 hover:border-rose-200"
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
    </div>
  );
}
