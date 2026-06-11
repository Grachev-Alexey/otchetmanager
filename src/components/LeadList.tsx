import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LeadReport, LeadStatus } from '../types';
import {
  Search, Edit3, Trash2, Calendar, Phone, MapPin,
  Layers, CheckCircle2, XCircle, Info,
  Banknote, Star, Copy, Check, ExternalLink
} from 'lucide-react';
import { FilterDatePicker, PortalSelect } from './ui';

function todayMsk(): string {
  return new Date().toLocaleDateString('sv', { timeZone: 'Europe/Moscow' });
}

function CopyPhone({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(phone).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div className="flex items-center gap-1.5 group">
      <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
      <a href={`tel:${phone}`} className="font-semibold text-neutral-600 hover:text-neutral-950 transition-colors">{phone}</a>
      <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="Скопировать номер">
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-neutral-400" />}
      </button>
    </div>
  );
}

function AmoLink({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };
  return (
    <div className="flex items-center gap-1.5 group">
      <a href={`https://wuuuu.amocrm.ru/leads/detail/${id}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] text-neutral-500 hover:text-neutral-800 transition-colors font-medium">
        <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded leading-none">AmoCRM</span>
        <span className="font-mono">#{id}</span>
        <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
      <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer" title="Скопировать ID">
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-neutral-400" />}
      </button>
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

const PAGE_SIZE = 50;

export default function LeadList({
  leads, onEdit, onDelete, currentUserRole, currentManagerName, shiftActive,
}: LeadListProps) {
  const [searchInput, setSearchInput]     = useState('');
  const [search, setSearch]               = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [bookingDateFrom, setBookingDateFrom] = useState<string>('');
  const [bookingDateTo,   setBookingDateTo]   = useState<string>('');
  const [createdAtFrom, setCreatedAtFrom] = useState<string>(() => todayMsk());
  const [createdAtTo,   setCreatedAtTo]   = useState<string>(() => todayMsk());
  const [depositFilter, setDepositFilter] = useState<'all' | 'paid' | 'not_paid' | 'not_required'>('all');
  const [cityFilter, setCityFilter]       = useState<string>('all');
  const [pageSize, setPageSize]           = useState(PAGE_SIZE);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(t);
  }, [searchInput]);

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

  const uniqueCities = useMemo(() =>
    Array.from(new Set(leads.map(l => l.city).filter(Boolean))).sort() as string[],
    [leads]
  );

  const getStatusConfig = (status: LeadStatus) => {
    switch (status) {
      case 'booked':       return { text: 'Запись создана',  icon: Calendar,    colorClasses: 'bg-indigo-50 border-indigo-200/50 text-indigo-700 font-semibold' };
      case 'rescheduled':  return { text: 'Запись перенесена', icon: Info,       colorClasses: 'bg-amber-50 border-amber-200/50 text-amber-700 font-semibold' };
      case 'showed_up':    return { text: 'Пришёл',          icon: CheckCircle2, colorClasses: 'bg-emerald-50 border-emerald-200/50 text-emerald-700 font-semibold' };
      case 'no_show':      return { text: 'Не пришёл',       icon: XCircle,      colorClasses: 'bg-rose-50 border-rose-200/50 text-rose-700' };
      case 'cancelled':    return { text: 'Отменена',         icon: XCircle,     colorClasses: 'bg-slate-50 border-slate-200 text-slate-500 font-medium' };
      default:             return { text: status,             icon: Info,         colorClasses: 'bg-neutral-50 border-neutral-200 text-neutral-600' };
    }
  };

  const canDelete = (lead: LeadReport) => {
    if (currentUserRole === 'admin') return true;
    return lead.status !== 'showed_up' && lead.status !== 'no_show';
  };

  const filterSig = useMemo(() =>
    `${search}|${Array.from(statusFilters).sort().join(',')}|${managerFilter}|${bookingDateFrom}|${bookingDateTo}|${createdAtFrom}|${createdAtTo}|${depositFilter}|${cityFilter}`,
    [search, statusFilters, managerFilter, bookingDateFrom, bookingDateTo, createdAtFrom, createdAtTo, depositFilter, cityFilter]
  );
  useEffect(() => { setPageSize(PAGE_SIZE); }, [filterSig]);

  const filteredLeads = useMemo(() => {
    const term = search.toLowerCase();
    return authorizedLeads.filter(lead => {
      const searchMatch = !search ||
        lead.clientName.toLowerCase().includes(term) ||
        (lead.clientPhone    && lead.clientPhone.includes(term)) ||
        (lead.amocrmLeadId   && lead.amocrmLeadId.toLowerCase().includes(term));

      const statusMatch = statusFilters.size === 0 || (() => {
        if (statusFilters.has('waiting')   && (lead.status === 'booked' || lead.status === 'rescheduled')) return true;
        if (statusFilters.has('showed_up') && lead.status === 'showed_up')  return true;
        if (statusFilters.has('no_show')   && lead.status === 'no_show')    return true;
        return false;
      })();

      const managerMatch = currentUserRole !== 'admin' || managerFilter === 'all' || lead.managerName === managerFilter;

      const cityMatch = cityFilter === 'all' || lead.city === cityFilter;

      const bd = String(lead.bookingDate).slice(0, 10);
      const bookingDateMatch = (!bookingDateFrom && !bookingDateTo) || (
        bookingDateFrom && bookingDateTo
          ? bd >= bookingDateFrom && bd <= bookingDateTo
          : bookingDateFrom ? bd >= bookingDateFrom : bd <= bookingDateTo
      );

      const cd = lead.createdAt ? lead.createdAt.slice(0, 10) : '';
      const createdAtMatch = (!createdAtFrom && !createdAtTo) || (
        createdAtFrom && createdAtTo
          ? cd >= createdAtFrom && cd <= createdAtTo
          : createdAtFrom ? cd >= createdAtFrom : cd <= createdAtTo
      );

      let depositMatch = true;
      if      (depositFilter === 'paid')         depositMatch = !!lead.yookassaPaid;
      else if (depositFilter === 'not_paid')     depositMatch = !!lead.depositRequired && !lead.yookassaPaid;
      else if (depositFilter === 'not_required') depositMatch = !lead.depositRequired;

      return searchMatch && statusMatch && managerMatch && cityMatch && bookingDateMatch && createdAtMatch && depositMatch;
    });
  }, [authorizedLeads, search, statusFilters, managerFilter, cityFilter, bookingDateFrom, bookingDateTo, createdAtFrom, createdAtTo, depositFilter, currentUserRole]);

  const hasActiveFilters = !!(bookingDateFrom || bookingDateTo)
    || !!(createdAtFrom || createdAtTo)
    || managerFilter !== 'all'
    || cityFilter    !== 'all'
    || statusFilters.size > 0
    || !!searchInput
    || depositFilter !== 'all';

  const resetFilters = useCallback(() => {
    setBookingDateFrom('');
    setBookingDateTo('');
    setCreatedAtFrom('');
    setCreatedAtTo('');
    setManagerFilter('all');
    setCityFilter('all');
    setStatusFilters(new Set());
    setSearchInput('');
    setSearch('');
    setDepositFilter('all');
  }, []);

  const visibleLeads = filteredLeads.slice(0, pageSize);
  const hasMore      = pageSize < filteredLeads.length;

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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-white/50 focus:bg-white/90 border border-neutral-200/60 text-neutral-850 placeholder-neutral-400 rounded-xl focus:outline-hidden focus:border-neutral-400 transition-all duration-200 font-semibold shadow-3xs"
          />
        </div>

        {/* Row 1: dates + manager + reset */}
        <div className="flex flex-wrap items-center gap-2 z-10">
          <FilterDatePicker label="Создана"  valueFrom={createdAtFrom}    valueTo={createdAtTo}    onChange={(f,t) => { setCreatedAtFrom(f);    setCreatedAtTo(t);    }} />
          <FilterDatePicker label="Визит"    valueFrom={bookingDateFrom}  valueTo={bookingDateTo}  onChange={(f,t) => { setBookingDateFrom(f);  setBookingDateTo(t);  }} />

          {currentUserRole === 'admin' && (
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

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="ml-auto text-[9.5px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-800 transition-colors px-3 py-2 border border-neutral-200/60 rounded-xl bg-white/50 cursor-pointer"
            >
              Сбросить
            </button>
          )}
        </div>

        {/* Row 2: status group + deposit group */}
        <div className="flex flex-wrap gap-2 z-10">

          {/* Status group */}
          <div className="flex bg-white/70 border border-neutral-200/60 rounded-xl p-1 gap-1 shadow-3xs">
            {[
              { id: 'waiting',   label: 'Ждём визит' },
              { id: 'showed_up', label: 'Пришёл' },
              { id: 'no_show',   label: 'Не пришёл' },
            ].map(btn => (
              <button key={btn.id} onClick={() => toggleStatus(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer whitespace-nowrap select-none ${
                  statusFilters.has(btn.id) ? 'bg-neutral-950 text-white' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/60'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Deposit group */}
          <div className="flex bg-white/70 border border-neutral-200/60 rounded-xl p-1 gap-1 shadow-3xs">
            {([
              { id: 'all',          label: 'Предоплата: все' },
              { id: 'paid',         label: 'Внесена' },
              { id: 'not_paid',     label: 'Не внесена' },
              { id: 'not_required', label: 'Не требуется' },
            ] as { id: 'all' | 'paid' | 'not_paid' | 'not_required'; label: string }[]).map(btn => (
              <button key={btn.id} onClick={() => setDepositFilter(btn.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors duration-150 cursor-pointer whitespace-nowrap select-none flex items-center gap-1 ${
                  depositFilter === btn.id ? 'bg-neutral-950 text-white' : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100/60'
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="spatial-glass rounded-3xl p-14 text-center relative overflow-hidden"
            >
              <Layers className="w-8 h-8 text-neutral-400 mx-auto mb-3 animate-pulse" />
              <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Записей не найдено</p>
              <p className="text-[11px] text-neutral-450 mt-2 max-w-sm mx-auto font-medium leading-relaxed">
                Попробуйте изменить дату или другие параметры фильтрации.
              </p>
            </motion.div>
          ) : (
            visibleLeads.map((lead, idx) => {
              const statusConfig = getStatusConfig(lead.status);
              const StatusIcon   = statusConfig.icon;
              const deletable    = canDelete(lead);

              return (
                <motion.div
                  key={lead.id || `lead-${idx}`}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                          <button onClick={() => onEdit(lead)}
                            className="px-3 py-2 bg-white/70 border border-neutral-200 hover:bg-neutral-950 hover:text-white hover:border-neutral-950 text-[10px] font-bold uppercase tracking-wider text-neutral-600 rounded-xl cursor-pointer transition-colors duration-150 flex items-center gap-1.5 shadow-4xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            Изменить
                          </button>
                          {deletable && (
                            <button onClick={() => lead.id && onDelete(lead.id)}
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

                      {lead.yookassaPaid ? (
                        <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border shrink-0 flex items-center gap-1.5 shadow-3xs bg-violet-50 text-violet-700 border-violet-200">
                          <Banknote className="w-3 h-3 shrink-0" />
                          {lead.yookassaAmount ? `Предоплата: ${lead.yookassaAmount.toLocaleString('ru')} ₽` : 'Предоплата внесена'}
                        </span>
                      ) : lead.depositRequired ? (
                        <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border shrink-0 flex items-center gap-1.5 shadow-3xs bg-orange-50 text-orange-600 border-orange-200">
                          <Banknote className="w-3 h-3 shrink-0" />
                          Предоплата не поступала
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
                        <span>Визит <strong className="text-neutral-750">{
                          (() => {
                            const s = String(lead.bookingDate).slice(0, 10);
                            const [y, m, d] = s.split('-').map(Number);
                            return new Date(y, m - 1, d).toLocaleDateString('ru-RU');
                          })()
                        }</strong></span>
                      </div>

                      {lead.clientPhone && <CopyPhone phone={lead.clientPhone} />}

                      <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-neutral-350 shrink-0" />
                        <span>{lead.managerName}</span>
                      </div>

                      {lead.city && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span>{lead.city}</span>
                        </div>
                      )}

                      {lead.amocrmLeadId && <AmoLink id={lead.amocrmLeadId} />}
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

        {hasMore && (
          <div className="pt-2 pb-1 text-center">
            <button onClick={() => setPageSize(p => p + PAGE_SIZE)}
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-neutral-800 border border-neutral-200/60 bg-white/60 hover:bg-white px-6 py-2.5 rounded-xl cursor-pointer transition-colors shadow-3xs"
            >
              Показать ещё — {filteredLeads.length - visibleLeads.length} из {filteredLeads.length}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
