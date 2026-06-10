import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle, XCircle, RefreshCw, Phone, Calendar, Banknote,
  AlertCircle, Edit3, Search, ChevronDown, User, MapPin,
  Clock, CheckCircle2, Star
} from 'lucide-react';
import type { CheckinLead, StaffMember } from '../types';
import { api } from '../api/client';

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

function todayMsk(): string {
  return new Date().toLocaleDateString('sv', { timeZone: 'Europe/Moscow' });
}

type YclientsFilter = 'all' | 'no_data' | 'waiting' | 'confirmed' | 'showed' | 'no_show_ycl';
type DepositFilter  = 'all' | 'paid' | 'not_paid' | 'no_deposit';

function yclientsLabel(att: number | null): { text: string; sub?: string; cls: string; dot: string } {
  switch (att) {
    case 1:  return { text: 'Пришёл', sub: 'данные Yclients', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' };
    case -1: return { text: 'Не пришёл', sub: 'данные Yclients', cls: 'bg-rose-50 border-rose-200 text-rose-700', dot: 'bg-rose-500' };
    case 0:  return { text: 'Ожидание клиента', cls: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-400' };
    case 2:  return { text: 'Подтвердил запись', cls: 'bg-indigo-50 border-indigo-200 text-indigo-700', dot: 'bg-indigo-500' };
    default: return { text: 'Нет данных Yclients', cls: 'bg-neutral-50 border-neutral-200 text-neutral-400', dot: 'bg-neutral-300' };
  }
}

export default function CheckinPage({ currentUser, onRefreshLeads, onEditLead, allUsers = [] }: Props) {
  const [items, setItems]           = useState<CheckinLead[]>([]);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState<Set<string>>(new Set());
  const [dismissed, setDismissed]   = useState<Set<string>>(new Set());
  const [fading, setFading]         = useState<Set<string>>(new Set());

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');
  const [managerFilter, setManagerFilter] = useState('all');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');
  const [ycFilter, setYcFilter]       = useState<YclientsFilter>('all');
  const [depFilter, setDepFilter]     = useState<DepositFilter>('all');

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

      if (term && !(
        l.clientName.toLowerCase().includes(term) ||
        (l.clientPhone && l.clientPhone.includes(term)) ||
        (l.amocrmLeadId && l.amocrmLeadId.toLowerCase().includes(term))
      )) return false;

      if (managerFilter !== 'all' && l.managerName !== managerFilter) return false;

      const bd = String(l.bookingDate).slice(0, 10);
      if (dateFrom && bd < dateFrom) return false;
      if (dateTo   && bd > dateTo)   return false;

      if (ycFilter !== 'all') {
        if (ycFilter === 'no_data'   && l.yclientsAttendance !== null)  return false;
        if (ycFilter === 'waiting'   && l.yclientsAttendance !== 0)     return false;
        if (ycFilter === 'confirmed' && l.yclientsAttendance !== 2)     return false;
        if (ycFilter === 'showed'    && l.yclientsAttendance !== 1)     return false;
        if (ycFilter === 'no_show_ycl' && l.yclientsAttendance !== -1) return false;
      }

      if (depFilter === 'paid'       && !(l.depositRequired && l.yookassaPaid)) return false;
      if (depFilter === 'not_paid'   && !(l.depositRequired && !l.yookassaPaid)) return false;
      if (depFilter === 'no_deposit' && l.depositRequired) return false;

      return true;
    });
  }, [items, dismissed, search, managerFilter, dateFrom, dateTo, ycFilter, depFilter]);

  const hasFilters = !!(search || searchInput || managerFilter !== 'all' || dateFrom || dateTo || ycFilter !== 'all' || depFilter !== 'all');

  const resetFilters = () => {
    setSearchInput(''); setSearch('');
    setManagerFilter('all');
    setDateFrom(''); setDateTo('');
    setYcFilter('all');
    setDepFilter('all');
  };

  const pendingCount = filtered.filter(l =>
    l.yclientsAttendance !== 1 && l.yclientsAttendance !== -1
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-display font-bold text-neutral-950 uppercase tracking-widest">
            Проверка визитов
          </h2>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">
            {filtered.length === 0
              ? 'Записей нет'
              : `${filtered.length} ${filtered.length === 1 ? 'запись' : filtered.length < 5 ? 'записи' : 'записей'}`
              + (pendingCount > 0 ? ` · ${pendingCount} ожидают подтверждения` : '')}
          </p>
        </div>
        <button
          onClick={fetchItems}
          className="p-2.5 rounded-xl bg-white/50 border border-neutral-200/60 hover:bg-white transition-colors duration-150 shadow-sm cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      </div>

      {/* Filters */}
      <div className="spatial-glass rounded-2xl p-4 flex flex-col gap-3">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Клиент, телефон, номер AmoCRM..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white/50 focus:bg-white/90 border border-neutral-200/60 text-neutral-850 placeholder-neutral-400 rounded-xl focus:outline-hidden focus:border-neutral-400 transition-all duration-200 font-semibold shadow-3xs"
          />
        </div>

        {/* Row 1: dates + manager + reset */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Date from */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-2.5 w-3 h-3 text-neutral-400 pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className={`text-xs pl-8 pr-3 py-2 border rounded-xl focus:outline-hidden cursor-pointer shadow-3xs transition-all duration-150 ${
                dateFrom ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white/60 hover:bg-white border-neutral-200/70 text-neutral-700'
              }`}
            />
          </div>

          <span className="text-neutral-300 text-xs">—</span>

          {/* Date to */}
          <div className="relative flex items-center">
            <Calendar className="absolute left-2.5 w-3 h-3 text-neutral-400 pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className={`text-xs pl-8 pr-3 py-2 border rounded-xl focus:outline-hidden cursor-pointer shadow-3xs transition-all duration-150 ${
                dateTo ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white/60 hover:bg-white border-neutral-200/70 text-neutral-700'
              }`}
            />
          </div>

          {/* Manager filter (admin only) */}
          {isAdmin && (
            <div className="relative flex items-center">
              <select
                value={managerFilter}
                onChange={e => setManagerFilter(e.target.value)}
                className={`text-[10px] font-bold pl-3 pr-7 py-2 border rounded-xl focus:outline-hidden cursor-pointer shadow-3xs transition-all duration-150 appearance-none ${
                  managerFilter !== 'all'
                    ? 'bg-neutral-950 text-white border-neutral-950'
                    : 'bg-white/60 hover:bg-white border-neutral-200/70 text-neutral-600'
                }`}
              >
                <option value="all">Все менеджеры</option>
                {uniqueManagers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className={`absolute right-2 w-3 h-3 pointer-events-none ${managerFilter !== 'all' ? 'text-white/60' : 'text-neutral-400'}`} />
            </div>
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

        {/* Row 2: Yclients status + Deposit */}
        <div className="flex flex-wrap gap-2">

          {/* Yclients status */}
          <div className="flex bg-white/70 border border-neutral-200/60 rounded-xl p-1 gap-1 shadow-3xs flex-wrap">
            {([
              { id: 'all',        label: 'Все статусы Yclients' },
              { id: 'no_data',    label: 'Нет данных' },
              { id: 'waiting',    label: 'Ожидание' },
              { id: 'confirmed',  label: 'Подтвердил' },
              { id: 'showed',     label: 'Пришёл ↗' },
              { id: 'no_show_ycl',label: 'Не пришёл ↗' },
            ] as { id: YclientsFilter; label: string }[]).map(btn => (
              <button
                key={btn.id}
                onClick={() => setYcFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer whitespace-nowrap select-none ${
                  ycFilter === btn.id
                    ? 'bg-neutral-950 text-white'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/60'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Deposit */}
          <div className="flex bg-white/70 border border-neutral-200/60 rounded-xl p-1 gap-1 shadow-3xs">
            {([
              { id: 'all',        label: 'Предоплата: все' },
              { id: 'paid',       label: 'Оплачена' },
              { id: 'not_paid',   label: 'Не оплачена' },
              { id: 'no_deposit', label: 'Без предоплаты' },
            ] as { id: DepositFilter; label: string }[]).map(btn => (
              <button
                key={btn.id}
                onClick={() => setDepFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer whitespace-nowrap select-none ${
                  depFilter === btn.id
                    ? 'bg-neutral-950 text-white'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/60'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
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

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(lead => {
          const id = lead.id ?? '';
          const isBusy = busy.has(id);
          const isFading = fading.has(id);
          const yc = yclientsLabel(lead.yclientsAttendance);
          const hasSuggestion = lead.yclientsAttendance === 1 || lead.yclientsAttendance === -1;

          return (
            <div
              key={id}
              className={`spatial-glass rounded-2xl p-5 flex flex-col gap-4 transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'} ${hasSuggestion ? 'ring-1 ring-indigo-100' : ''}`}
            >
              {/* Top row: date/ago + manager + edit */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="text-[10px] font-bold text-neutral-600 uppercase tracking-wider whitespace-nowrap">
                    {fmtDate(lead.bookingDate)}
                  </span>
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider bg-neutral-100 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                    {daysAgo(lead.bookingDate)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider truncate max-w-[90px]">
                    {lead.managerName}
                  </span>
                  {onEditLead && (
                    <button
                      onClick={() => onEditLead(lead)}
                      className="p-1.5 rounded-lg bg-white/70 border border-neutral-200 hover:bg-neutral-950 hover:text-white hover:border-neutral-950 text-neutral-400 cursor-pointer transition-colors duration-150"
                      title="Изменить"
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

              {/* Yclients status */}
              <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${yc.cls}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${yc.dot}`} />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide">{yc.text}</span>
                  {yc.sub && <span className="text-[9px] font-medium opacity-60 ml-2">{yc.sub}</span>}
                  {lead.yclientsStaff && (
                    <span className="text-[9px] font-medium opacity-60 ml-2">· {lead.yclientsStaff}</span>
                  )}
                </div>
                {hasSuggestion && (
                  <span className="text-[8px] font-bold uppercase tracking-widest opacity-60 shrink-0">Подтвердить</span>
                )}
              </div>

              {/* Deposit / referral row */}
              <div className="flex flex-wrap gap-2">
                {lead.isReferral && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border bg-amber-50 text-amber-700 border-amber-200">
                    <Star className="w-3 h-3" />
                    По рекомендации
                  </span>
                )}
                {lead.yookassaPaid ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border bg-violet-50 text-violet-700 border-violet-200">
                    <Banknote className="w-3 h-3" />
                    {lead.yookassaAmount ? `Предоплата: ${lead.yookassaAmount.toLocaleString('ru')} ₽` : 'Предоплата внесена'}
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
                    Визит: {lead.visitCost.toLocaleString('ru')} ₽
                  </span>
                )}
              </div>

              {/* Comments */}
              {lead.comments && (
                <div className="bg-neutral-50/70 px-3.5 py-2.5 rounded-xl border border-neutral-150/45 text-[11px] text-neutral-500 leading-relaxed shadow-3xs">
                  <span className="font-bold text-[8.5px] uppercase tracking-wider text-neutral-400 mr-2">Комментарий:</span>
                  {lead.comments}
                </div>
              )}

              {/* Action buttons */}
              {isAdmin && (
                <div className="flex gap-2 pt-0.5">
                  <button
                    disabled={isBusy}
                    onClick={() => handleStatus(id, 'showed_up')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
                      lead.yclientsAttendance === 1
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white ring-2 ring-emerald-200'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    Пришёл
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => handleStatus(id, 'no_show')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
                      lead.yclientsAttendance === -1
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 ring-2 ring-rose-100'
                        : 'bg-neutral-100 hover:bg-rose-50 text-neutral-600 hover:text-rose-600 border border-neutral-200/60 hover:border-rose-200'
                    }`}
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
