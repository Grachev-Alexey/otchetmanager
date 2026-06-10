import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LeadReport, LeadStatus } from '../types';
import {
  Search, Edit3, Trash2, Calendar, Phone,
  Layers, CheckCircle2, XCircle, Info, ChevronDown,
  Banknote, ChevronLeft, ChevronRight, CalendarDays, Star
} from 'lucide-react';

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function todayMsk(): string {
  return new Date().toLocaleDateString('sv', { timeZone: 'Europe/Moscow' });
}

function parseDateStr(str: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(str: string): string {
  const d = parseDateStr(str);
  if (!d) return 'Все записи';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function FilterDatePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const today = todayMsk();
  const initDate = parseDateStr(value) || new Date();
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const updatePos = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left });
    }
  };

  const handleOpen = () => {
    if (!open) updatePos();
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(target) &&
        dropRef.current && !dropRef.current.contains(target)
      ) setOpen(false);
    }
    function handleScroll() { updatePos(); }
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const isActive = !!value;

  return (
    <div className="relative flex items-center">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={`text-xs pl-3 pr-7 py-2 border rounded-xl focus:outline-hidden cursor-pointer shadow-3xs transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
          isActive
            ? 'bg-neutral-950 text-white border-neutral-950'
            : 'bg-white/60 hover:bg-white border-neutral-200/70 text-neutral-700'
        }`}
      >
        <CalendarDays className={`w-3 h-3 shrink-0 ${isActive ? 'text-white/70' : 'text-neutral-400'}`} />
        <span className={`font-medium ${isActive ? 'text-white/70' : 'text-neutral-400'}`}>{label}</span>
        <span className={isActive ? 'text-white/40' : 'text-neutral-300'}>·</span>
        <span className="font-bold">{value ? fmtDate(value) : 'Все'}</span>
      </button>
      <ChevronDown className={`absolute right-2 w-3 h-3 pointer-events-none ${isActive ? 'text-white/60' : 'text-neutral-400'}`} />

      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-neutral-100 rounded-2xl shadow-2xl p-4 w-72"
        >
          {/* Quick actions */}
          <div className="flex gap-2 mb-3 pb-3 border-b border-neutral-100">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                !value ? 'bg-neutral-950 text-white' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 border border-neutral-150'
              }`}
            >
              Все записи
            </button>
            <button
              type="button"
              onClick={() => {
                const d = parseDateStr(today) || new Date();
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
                onChange(today);
                setOpen(false);
              }}
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                value === today ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-100'
              }`}
            >
              Сегодня
            </button>
          </div>

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4 text-neutral-500" />
            </button>
            <span className="text-sm font-bold text-neutral-800">{MONTHS_RU[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-neutral-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = toDateStr(new Date(viewYear, viewMonth, day));
              const isSelected = value === dateStr;
              const isToday = today === dateStr;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onChange(dateStr); setOpen(false); }}
                  className={`text-xs font-medium rounded-lg py-1.5 transition-colors duration-100 cursor-pointer
                    ${isSelected ? 'bg-indigo-600 text-white font-bold' :
                      isToday ? 'bg-indigo-50 text-indigo-700 font-bold' :
                      'hover:bg-neutral-100 text-neutral-700'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      , document.body)}
    </div>
  );
}

interface LeadListProps {
  leads: LeadReport[];
  onEdit: (lead: LeadReport) => void;
  onDelete: (id: string) => Promise<void>;
  currentUserRole: 'admin' | 'manager';
  currentManagerName: string;
  shiftActive?: boolean;
}

export default function LeadList({
  leads,
  onEdit,
  onDelete,
  currentUserRole,
  currentManagerName,
  shiftActive,
}: LeadListProps) {
  const [search, setSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [bookingDateFilter, setBookingDateFilter] = useState<string>('');
  const [createdAtFilter, setCreatedAtFilter] = useState<string>(() => todayMsk());
  const [depositFilter, setDepositFilter] = useState<'all' | 'paid' | 'not_paid' | 'not_required'>('all');

  const toggleStatus = (id: string) => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const authorizedLeads = useMemo(() =>
    currentUserRole === 'admin'
      ? leads
      : leads.filter(l => l.managerName === currentManagerName),
    [leads, currentUserRole, currentManagerName]
  );

  const uniqueManagers = useMemo(() =>
    Array.from(new Set(leads.map(l => l.managerName).filter(Boolean))),
    [leads]
  );

  const getStatusConfig = (status: LeadStatus) => {
    switch (status) {
      case 'booked':
        return { text: 'Запись создана', icon: Calendar, colorClasses: 'bg-indigo-50 border-indigo-200/50 text-indigo-700 font-semibold' };
      case 'rescheduled':
        return { text: 'Запись перенесена', icon: Info, colorClasses: 'bg-amber-50 border-amber-200/50 text-amber-700 font-semibold' };
      case 'showed_up':
        return { text: 'Пришёл', icon: CheckCircle2, colorClasses: 'bg-emerald-50 border-emerald-200/50 text-emerald-700 font-semibold' };
      case 'no_show':
        return { text: 'Не пришёл', icon: XCircle, colorClasses: 'bg-rose-50 border-rose-200/50 text-rose-700' };
      case 'cancelled':
        return { text: 'Отменена', icon: XCircle, colorClasses: 'bg-slate-50 border-slate-200 text-slate-500 font-medium' };
      default:
        return { text: status, icon: Info, colorClasses: 'bg-neutral-50 border-neutral-200 text-neutral-600' };
    }
  };

  const canDelete = (lead: LeadReport) => {
    if (currentUserRole === 'admin') return true;
    return lead.status !== 'showed_up' && lead.status !== 'no_show';
  };

  const filteredLeads = useMemo(() => {
    const term = search.toLowerCase();
    return authorizedLeads.filter(lead => {
      const searchMatch = !search ||
        lead.clientName.toLowerCase().includes(term) ||
        (lead.clientPhone && lead.clientPhone.includes(term)) ||
        (lead.amocrmLeadId && lead.amocrmLeadId.toLowerCase().includes(term));

      const statusMatch = statusFilters.size === 0 || (() => {
        if (statusFilters.has('waiting') && (lead.status === 'booked' || lead.status === 'rescheduled')) return true;
        if (statusFilters.has('showed_up') && lead.status === 'showed_up') return true;
        if (statusFilters.has('no_show') && lead.status === 'no_show') return true;
        return false;
      })();

      const managerMatch = currentUserRole !== 'admin' || managerFilter === 'all' || lead.managerName === managerFilter;

      const bookingDateMatch = !bookingDateFilter || String(lead.bookingDate).slice(0, 10) === bookingDateFilter;

      const createdAtMatch = !createdAtFilter || (lead.createdAt && lead.createdAt.slice(0, 10) === createdAtFilter);

      let depositMatch = true;
      if (depositFilter === 'paid') {
        depositMatch = !!lead.yookassaPaid;
      } else if (depositFilter === 'not_paid') {
        depositMatch = !!lead.depositRequired && !lead.yookassaPaid;
      } else if (depositFilter === 'not_required') {
        depositMatch = !lead.depositRequired;
      }

      return searchMatch && statusMatch && managerMatch && bookingDateMatch && createdAtMatch && depositMatch;
    });
  }, [authorizedLeads, search, statusFilters, managerFilter, bookingDateFilter, createdAtFilter, depositFilter, currentUserRole]);

  const defaultCreatedAt = todayMsk();
  const hasActiveFilters = !!bookingDateFilter || createdAtFilter !== defaultCreatedAt || managerFilter !== 'all' || statusFilters.size > 0 || !!search || depositFilter !== 'all';

  const resetFilters = () => {
    setBookingDateFilter('');
    setCreatedAtFilter(defaultCreatedAt);
    setManagerFilter('all');
    setStatusFilters(new Set());
    setSearch('');
    setDepositFilter('all');
  };

  return (
    <div className="space-y-6">

      {/* Search & Filters */}
      <div className="spatial-glass rounded-2xl p-4 flex flex-col gap-3 relative">

        {/* Search */}
        <div className="relative z-10">
          <Search className="absolute left-3.5 top-3 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Поиск по клиенту, телефону или номеру сделки AmoCRM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white/50 focus:bg-white/90 border border-neutral-200/60 text-neutral-850 placeholder-neutral-400 rounded-xl focus:outline-hidden focus:border-neutral-400 transition-all duration-200 font-semibold shadow-3xs"
          />
        </div>

        {/* Row 1: dates + manager + reset */}
        <div className="flex flex-wrap items-center gap-2 z-10">
          <FilterDatePicker label="Создана" value={createdAtFilter} onChange={setCreatedAtFilter} />
          <FilterDatePicker label="Визит" value={bookingDateFilter} onChange={setBookingDateFilter} />

          {currentUserRole === 'admin' && (
            <div className="relative flex items-center">
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className={`text-[10px] font-bold pl-3 pr-7 py-2 border rounded-xl focus:outline-hidden cursor-pointer shadow-3xs transition-all duration-150 appearance-none ${
                  managerFilter !== 'all'
                    ? 'bg-neutral-950 text-white border-neutral-950'
                    : 'bg-white/60 hover:bg-white border-neutral-200/70 text-neutral-600'
                }`}
              >
                <option value="all">Все менеджеры</option>
                {uniqueManagers.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className={`absolute right-2 w-3 h-3 pointer-events-none ${managerFilter !== 'all' ? 'text-white/60' : 'text-neutral-400'}`} />
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto text-[9.5px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-800 transition-colors px-3 py-2 border border-neutral-200/60 rounded-xl bg-white/50 cursor-pointer"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Row 2: status group + deposit group — each wraps as a unit */}
        <div className="flex flex-wrap gap-2 z-10">

          {/* Status group */}
          <div className="flex bg-white/70 border border-neutral-200/60 rounded-xl p-1 gap-1 shadow-3xs">
            {[
              { id: 'waiting', label: 'Ждём визит' },
              { id: 'showed_up', label: 'Пришёл' },
              { id: 'no_show', label: 'Не пришёл' },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => toggleStatus(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer whitespace-nowrap select-none ${
                  statusFilters.has(btn.id)
                    ? 'bg-neutral-950 text-white'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/60'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Deposit group */}
          <div className="flex bg-white/70 border border-neutral-200/60 rounded-xl p-1 gap-1 shadow-3xs">
            {([
              { id: 'all', label: 'Предоплата: все' },
              { id: 'paid', label: 'Внесена' },
              { id: 'not_paid', label: 'Не внесена' },
              { id: 'not_required', label: 'Не требуется' },
            ] as { id: 'all' | 'paid' | 'not_paid' | 'not_required'; label: string }[]).map(btn => (
              <button
                key={btn.id}
                onClick={() => setDepositFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer whitespace-nowrap select-none flex items-center gap-1 ${
                  depositFilter === btn.id
                    ? 'bg-neutral-950 text-white'
                    : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/60'
                }`}
              >
                {btn.id === 'paid' && <Banknote className="w-3 h-3 shrink-0" />}
                {btn.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        <AnimatePresence mode="sync">
          {filteredLeads.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="spatial-glass rounded-3xl p-14 text-center relative overflow-hidden"
            >
              <Layers className="w-8 h-8 text-neutral-400 mx-auto mb-3 animate-pulse" />
              <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Записей не найдено</p>
              <p className="text-[11px] text-neutral-450 mt-2 max-w-sm mx-auto font-medium leading-relaxed">
                Попробуйте изменить дату или другие параметры фильтрации.
              </p>
            </motion.div>
          ) : (
            filteredLeads.map((lead, idx) => {
              const statusConfig = getStatusConfig(lead.status);
              const StatusIcon = statusConfig.icon;
              const deletable = canDelete(lead);

              return (
                <motion.div
                  key={lead.id || `lead-${idx}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="spatial-glass rounded-2xl p-5 relative shadow-3xs"
                >
                  <div className="flex flex-col gap-3 relative z-10">

                    {/* Row 1: name + creation date + actions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="font-display font-bold text-neutral-950 text-base tracking-tight leading-tight truncate">
                          {lead.clientName}
                        </span>
                        {lead.createdAt && (
                          <span className="text-[10px] text-neutral-400 font-medium">
                            Создана {new Date(lead.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        )}
                      </div>

                      {(currentUserRole === 'admin' || shiftActive !== false) && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => onEdit(lead)}
                            className="px-3 py-2 bg-white/70 border border-neutral-200 hover:bg-neutral-950 hover:text-white hover:border-neutral-950 text-[10px] font-bold uppercase tracking-wider text-neutral-600 rounded-xl cursor-pointer transition-colors duration-150 flex items-center gap-1.5 shadow-4xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            Изменить
                          </button>
                          {deletable && (
                            <button
                              onClick={() => lead.id && onDelete(lead.id)}
                              className="p-2 border border-neutral-150/50 bg-white/40 hover:bg-rose-500 hover:text-white text-neutral-400 rounded-xl shadow-3xs transition-colors duration-150 cursor-pointer"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Row 2: status + deposit badges */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-lg border flex items-center gap-1.5 shrink-0 shadow-4xs ${statusConfig.colorClasses}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.text}
                      </span>

                      {lead.isReferral && (
                        <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border shrink-0 flex items-center gap-1.5 shadow-3xs bg-amber-50 text-amber-700 border-amber-200">
                          <Star className="w-3 h-3 shrink-0" />
                          По рекомендации
                        </span>
                      )}

                      {lead.depositRequired ? (
                        <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border shrink-0 flex items-center gap-1.5 shadow-3xs ${
                          lead.yookassaPaid
                            ? 'bg-violet-50 text-violet-700 border-violet-200'
                            : 'bg-orange-50 text-orange-600 border-orange-200'
                        }`}>
                          <Banknote className="w-3 h-3 shrink-0" />
                          {lead.yookassaPaid
                            ? (lead.yookassaAmount ? `Предоплата: ${lead.yookassaAmount.toLocaleString('ru')} ₽` : 'Предоплата внесена')
                            : 'Предоплата не поступала'
                          }
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-[9px] font-medium rounded-lg border shrink-0 flex items-center gap-1.5 bg-neutral-50 text-neutral-400 border-neutral-200/50">
                          Без предоплаты
                        </span>
                      )}
                    </div>

                    {/* Row 3: key info */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-neutral-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>Визит <strong className="text-neutral-750">{new Date(lead.bookingDate).toLocaleDateString('ru-RU')}</strong></span>
                      </div>

                      {lead.clientPhone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <a href={`tel:${lead.clientPhone}`} className="font-semibold text-neutral-600 hover:text-neutral-950 transition-colors">
                            {lead.clientPhone}
                          </a>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-neutral-350 shrink-0" />
                        <span>{lead.managerName}</span>
                      </div>

                      {lead.amocrmLeadId && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded leading-none">AmoCRM</span>
                          <span className="font-mono text-neutral-600 select-all">#{lead.amocrmLeadId}</span>
                        </div>
                      )}
                    </div>

                    {/* Comment */}
                    {lead.comments && (
                      <div className="bg-neutral-50/70 px-3.5 py-3 rounded-xl border border-neutral-150/45 text-[11px] text-neutral-500 leading-relaxed shadow-3xs">
                        <span className="font-bold text-[8.5px] uppercase tracking-wider text-neutral-400 mr-2">Комментарий:</span>
                        {lead.comments}
                      </div>
                    )}

                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
