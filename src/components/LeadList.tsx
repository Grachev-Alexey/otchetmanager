import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LeadReport, LeadStatus } from '../types';
import { 
  Search, Edit3, Trash2, Calendar, Phone, 
  Layers, CheckCircle2, XCircle, Info, ChevronDown
} from 'lucide-react';

const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

interface LeadListProps {
  leads: LeadReport[];
  onEdit: (lead: LeadReport) => void;
  onDelete: (id: string) => Promise<void>;
  currentUserRole: 'admin' | 'manager';
  currentManagerName: string;
}

export default function LeadList({ 
  leads, 
  onEdit, 
  onDelete, 
  currentUserRole, 
  currentManagerName 
}: LeadListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const authorizedLeads = currentUserRole === 'admin' 
    ? leads 
    : leads.filter(l => l.managerName === currentManagerName);

  const uniqueManagers = Array.from(new Set(leads.map(l => l.managerName).filter(Boolean)));

  // Unique periods (year-month) from authorized leads, sorted newest first
  const uniquePeriods: { key: string; label: string }[] = Array.from(new Set(
    authorizedLeads
      .map(l => {
        if (!l.bookingDate) return null;
        const d = new Date(l.bookingDate);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      })
      .filter(Boolean) as string[]
  ))
    .sort()
    .reverse()
    .map(key => {
      const [y, m] = key.split('-');
      return { key, label: `${MONTHS_RU[parseInt(m) - 1]} ${y}` };
    });

  const getStatusConfig = (status: LeadStatus) => {
    switch (status) {
      case 'booked':
        return { text: 'Зарегистрирована запись', icon: Calendar, colorClasses: 'bg-indigo-50 border-indigo-200/50 text-indigo-700 font-semibold' };
      case 'rescheduled':
        return { text: 'Запись перенесена', icon: Info, colorClasses: 'bg-amber-50 border-amber-200/50 text-amber-700 font-semibold' };
      case 'showed_up':
        return { text: 'Визит состоялся', icon: CheckCircle2, colorClasses: 'bg-emerald-50 border-emerald-200/50 text-emerald-700 font-semibold' };
      case 'no_show':
        return { text: 'Не пришёл', icon: XCircle, colorClasses: 'bg-rose-50 border-rose-200/50 text-rose-700' };
      case 'cancelled':
        return { text: 'Отменена', icon: XCircle, colorClasses: 'bg-slate-50 border-slate-200 text-slate-500 font-medium' };
      default:
        return { text: status, icon: Info, colorClasses: 'bg-neutral-50 border-neutral-200 text-neutral-600' };
    }
  };

  const filteredLeads = authorizedLeads.filter(lead => {
    const term = search.toLowerCase();
    const searchMatch = !search || 
      lead.clientName.toLowerCase().includes(term) ||
      (lead.clientPhone && lead.clientPhone.includes(term)) ||
      (lead.amocrmLeadId && lead.amocrmLeadId.toLowerCase().includes(term));

    const statusMatch = statusFilter === 'all' || lead.status === statusFilter;
    const managerMatch = currentUserRole !== 'admin' || managerFilter === 'all' || lead.managerName === managerFilter;

    let periodMatch = true;
    if (periodFilter !== 'all' && lead.bookingDate) {
      const d = new Date(lead.bookingDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      periodMatch = key === periodFilter;
    }

    return searchMatch && statusMatch && managerMatch && periodMatch;
  });

  return (
    <div className="space-y-6">
      
      {/* Search & Filters */}
      <div className="spatial-glass rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300">
        <div className="absolute -left-20 -bottom-20 w-44 h-44 bg-neutral-200/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Search */}
        <div className="relative flex-1 z-10">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-neutral-450" />
          <input
            type="text"
            placeholder="Поиск по клиенту, телефону или номеру сделки AmoCRM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-xs bg-white/40 focus:bg-white/80 border border-neutral-150/60 text-neutral-850 placeholder-neutral-400 rounded-xl focus:outline-hidden focus:border-neutral-900 transition-all duration-350 font-semibold shadow-3xs"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-3 z-10">

          {/* Period filter */}
          <div className="relative flex items-center">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="text-xs font-bold pl-4 pr-8 py-2.5 bg-white/40 focus:bg-white/85 border border-neutral-150/60 rounded-xl focus:border-neutral-900 focus:outline-hidden text-neutral-800 cursor-pointer shadow-3xs transition-all duration-300 appearance-none"
            >
              <option value="all">Все периоды</option>
              {uniquePeriods.map(p => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
          </div>

          {/* Manager filter (admin only) */}
          {currentUserRole === 'admin' && (
            <div className="relative flex items-center">
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="text-xs font-bold pl-4 pr-8 py-2.5 bg-white/40 focus:bg-white/85 border border-neutral-150/60 rounded-xl focus:border-neutral-900 focus:outline-hidden text-neutral-800 cursor-pointer shadow-3xs transition-all duration-300 appearance-none"
              >
                <option value="all">Все менеджеры</option>
                {uniqueManagers.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 w-3.5 h-3.5 text-neutral-400 pointer-events-none" />
            </div>
          )}

          {/* Status pills */}
          <div className="flex bg-white/80 p-1 rounded-xl border border-neutral-200/50 overflow-x-auto gap-1 self-stretch scrollbar-none shadow-3xs">
            {[
              { id: 'all', label: 'Все' },
              { id: 'booked', label: 'Ожидает' },
              { id: 'showed_up', label: 'Визиты' },
              { id: 'no_show', label: 'Не пришли' },
              { id: 'cancelled', label: 'Отмены' },
            ].map(btn => (
              <button
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                className={`px-4 py-2 rounded-lg text-[9.5px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer whitespace-nowrap select-none ${
                  statusFilter === btn.id 
                    ? 'bg-neutral-950 text-white shadow-sm font-extrabold' 
                    : 'text-neutral-500 hover:text-neutral-950 hover:bg-neutral-100/50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Active filters count / reset */}
          {(periodFilter !== 'all' || managerFilter !== 'all' || statusFilter !== 'all' || search) && (
            <button
              onClick={() => { setPeriodFilter('all'); setManagerFilter('all'); setStatusFilter('all'); setSearch(''); }}
              className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-950 transition px-3 py-2 border border-neutral-200/50 rounded-xl bg-white/40 cursor-pointer"
            >
              Сбросить
            </button>
          )}

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
              <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Записи пока отсутствуют</p>
              <p className="text-[11px] text-neutral-450 mt-2 max-w-sm mx-auto font-medium leading-relaxed">
                Добавьте новую запись или измените параметры фильтрации.
              </p>
            </motion.div>
          ) : (
            filteredLeads.map((lead, idx) => {
              const statusConfig = getStatusConfig(lead.status);
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div 
                  key={lead.id || `lead-${idx}`} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="spatial-glass rounded-2xl p-6 relative shadow-3xs"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 relative z-10">
                    
                    <div className="space-y-4 flex-1 min-w-0">
                      
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-display font-semibold text-neutral-950 text-sm tracking-tight leading-none">
                          {lead.clientName}
                        </span>
                        
                        <span className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-lg border flex items-center gap-1.5 shrink-0 shadow-4xs transition-all duration-300 ${statusConfig.colorClasses}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.text}
                        </span>

                        {lead.depositRequired && (
                          <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border shrink-0 flex items-center gap-1.5 shadow-3xs transition-all duration-300 ${
                            lead.depositPaid 
                              ? 'bg-neutral-950 text-white border-neutral-950' 
                              : 'bg-white/60 text-neutral-550 border-neutral-200/50'
                          }`}>
                            <span>Предоплата:</span>
                            <span className="font-bold">{lead.depositAmount.toLocaleString()} ₽</span>
                            <span className="w-1 h-1 rounded-full bg-neutral-300" />
                            <span>{lead.depositPaid ? 'Внесена' : 'Ожидается'}</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-2.5 gap-x-4 text-[11px] text-neutral-450 font-medium">
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span>Дата записи: <strong className="text-neutral-750 font-semibold">{new Date(lead.bookingDate).toLocaleDateString('ru-RU')}</strong></span>
                        </div>

                        {lead.clientPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-neutral-400 shrink-0" />
                            <a 
                              href={`tel:${lead.clientPhone}`}
                              className="font-semibold text-neutral-600 hover:text-neutral-950 transition-colors"
                            >
                              {lead.clientPhone}
                            </a>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                          <span>Менеджер: <strong className="text-neutral-750 font-semibold">{lead.managerName}</strong></span>
                        </div>

                        {lead.amocrmLeadId && (
                          <div className="flex items-center gap-2 sm:col-span-3 pt-1">
                            <span className="text-[8px] font-bold uppercase tracking-wider text-neutral-500 bg-white/70 border border-neutral-150/50 px-2 py-0.5 rounded shadow-3xs leading-none">
                              ID Сделки AmoCRM
                            </span>
                            <span className="text-neutral-750 font-mono text-xs select-all">#{lead.amocrmLeadId}</span>
                          </div>
                        )}
                      </div>

                      {lead.comments && (
                        <div className="bg-neutral-50/60 p-3.5 rounded-xl border border-neutral-150/45 text-xs text-neutral-500 leading-relaxed shadow-3xs">
                          <span className="font-bold block text-[8.5px] uppercase tracking-wider text-neutral-400 mb-1">Комментарий:</span>
                          {lead.comments}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-start shrink-0 pt-2 md:pt-0">
                      <button
                        onClick={() => onEdit(lead)}
                        className="px-3.5 py-2.5 bg-white/70 border border-neutral-200 hover:bg-neutral-950 hover:text-white hover:border-neutral-950 active:scale-95 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 rounded-xl cursor-pointer transition-all duration-300 flex items-center gap-1.5 shadow-4xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Изменить
                      </button>

                      {currentUserRole === 'admin' && (
                        <button
                          onClick={() => lead.id && onDelete(lead.id)}
                          className="p-2.5 border border-neutral-150/50 bg-white/40 hover:bg-rose-500 hover:text-white active:scale-95 text-neutral-400 rounded-xl shadow-3xs hover:shadow-3xs transition-all duration-350 cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

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
