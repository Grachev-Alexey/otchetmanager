import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LeadReport, LeadStatus } from '../types';
import { 
  Search, Edit3, Trash2, Calendar, Phone, 
  Layers, CheckCircle2, XCircle, Info
} from 'lucide-react';

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

  const authorizedLeads = currentUserRole === 'admin' 
    ? leads 
    : leads.filter(l => l.managerName === currentManagerName);

  const uniqueManagers = Array.from(new Set(leads.map(l => l.managerName).filter(Boolean)));

  const getStatusConfig = (status: LeadStatus) => {
    switch (status) {
      case 'booked':
        return { 
          text: 'Зарегистрирована запись', 
          icon: Calendar,
          colorClasses: 'bg-indigo-50 border-indigo-200/50 text-indigo-700 font-semibold'
        };
      case 'rescheduled':
        return { 
          text: 'Запись перенесена', 
          icon: Info,
          colorClasses: 'bg-amber-50 border-amber-200/50 text-amber-700 font-semibold'
        };
      case 'showed_up':
        return { 
          text: 'Визит состоялся', 
          icon: CheckCircle2,
          colorClasses: 'bg-emerald-50 border-emerald-200/50 text-emerald-700 font-semibold'
        };
      case 'no_show':
        return { 
          text: 'Не пришёл', 
          icon: XCircle,
          colorClasses: 'bg-rose-50 border-rose-200/50 text-rose-700'
        };
      case 'cancelled':
        return { 
          text: 'Отменена', 
          icon: XCircle,
          colorClasses: 'bg-slate-50 border-slate-200 text-slate-500 font-medium'
        };
      default:
        return { 
          text: status, 
          icon: Info,
          colorClasses: 'bg-neutral-50 border-neutral-200 text-neutral-600'
        };
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

    return searchMatch && statusMatch && managerMatch;
  });

  return (
    <div className="space-y-6">
      
      {/* Search & Filters */}
      <div className="spatial-glass rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 relative overflow-hidden transition-all duration-300">
        <div className="absolute -left-20 -bottom-20 w-44 h-44 bg-neutral-200/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Interactive Search Bar */}
        <div className="relative flex-1 z-10">
          <Search className="absolute left-4 top-3.5 w-4 h-4 text-neutral-450" />
          <input
            id="search-leads-input"
            type="text"
            placeholder="Поиск по клиенту, телефону или номеру сделки AmoCRM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 text-xs bg-white/40 focus:bg-white/80 border border-neutral-150/60 text-neutral-850 placeholder-neutral-400 rounded-xl focus:outline-hidden focus:border-neutral-900 transition-all duration-350 font-semibold shadow-3xs"
          />
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 z-10">
          
          {currentUserRole === 'admin' && (
            <div className="relative flex items-center min-w-[190px]">
              <select
                id="manager-filter-select"
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                className="w-full text-xs font-bold pl-4 pr-10 py-3 bg-white/40 focus:bg-white/85 border border-neutral-150/60 rounded-xl focus:border-neutral-900 focus:outline-hidden text-neutral-800 cursor-pointer shadow-3xs transition-all duration-300"
              >
                <option value="all">👥 Все менеджеры</option>
                {uniqueManagers.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Group of Status Pills */}
          <div className="flex bg-white/80 p-1 rounded-xl border border-neutral-200/50 overflow-x-auto gap-1 self-stretch xl:self-auto scrollbar-none shadow-3xs">
            {[
              { id: 'all', label: 'Все записи' },
              { id: 'booked', label: 'Ожидает' },
              { id: 'showed_up', label: 'Визиты' },
              { id: 'no_show', label: 'Не пришли' },
              { id: 'cancelled', label: 'Отмены' }
            ].map(btn => (
              <button
                id={`filter-btn-${btn.id}`}
                key={btn.id}
                onClick={() => setStatusFilter(btn.id)}
                className={`px-4 py-2 rounded-lg text-[9.5px] font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer whitespace-nowrap select-none ${
                  statusFilter === btn.id 
                    ? 'bg-indigo-600 text-white shadow-[0_3px_11px_-2px_rgba(79,70,229,0.4)] scale-102 font-extrabold' 
                    : 'text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50/40'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Leads List Grid */}
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
              <div className="absolute inset-0 bg-white/5 -z-10" />
              <Layers className="w-8 h-8 text-neutral-400 mx-auto mb-3 animate-pulse" />
              <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Записи пока отсутствуют</p>
              <p className="text-[11px] text-neutral-450 mt-2 max-w-sm mx-auto font-medium leading-relaxed">
                Добавьте новую запись или попробуйте изменить параметры поиска/фильтрации.
              </p>
            </motion.div>
          ) : (
            filteredLeads.map((lead, idx) => {
              const statusConfig = getStatusConfig(lead.status);
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div 
                  id={`lead-card-${lead.id}`}
                  key={lead.id || `lead-${idx}`} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="spatial-glass rounded-2xl p-6 relative shadow-3xs"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 relative z-10">
                    
                    {/* Info */}
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

                      {/* Info grid of transaction specs */}
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
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-4xs" />
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

                      {/* Comments inside panel */}
                      {lead.comments && (
                        <div className="bg-neutral-50/60 p-3.5 rounded-xl border border-neutral-150/45 text-xs text-neutral-500 leading-relaxed shadow-3xs">
                          <span className="font-bold block text-[8.5px] uppercase tracking-wider text-neutral-400 mb-1">Комментарий:</span>
                          {lead.comments}
                        </div>
                      )}
                    </div>

                    {/* Action elements */}
                    <div className="flex items-center gap-2 self-end md:self-start shrink-0 pt-2 md:pt-0">
                      <button
                        id={`edit-btn-${lead.id}`}
                        onClick={() => onEdit(lead)}
                        className="px-3.5 py-2.5 bg-white/70 border border-neutral-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 rounded-xl cursor-pointer transition-all duration-300 flex items-center gap-1.5 shadow-4xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Изменить
                      </button>

                      {currentUserRole === 'admin' && (
                        <button
                          id={`delete-btn-${lead.id}`}
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
