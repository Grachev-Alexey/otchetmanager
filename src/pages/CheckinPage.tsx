import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, RefreshCw, Phone, Calendar, Banknote, AlertCircle, Zap } from 'lucide-react';
import type { CheckinLead, StaffMember } from '../types';
import { api } from '../api/client';

interface Props {
  currentUser: StaffMember;
  onRefreshLeads: () => Promise<void>;
}

const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

function fmtDate(raw: string): string {
  const d = new Date(raw);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function daysAgo(raw: string): string {
  const date = new Date(raw);
  const todayMsk = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  todayMsk.setHours(0, 0, 0, 0);
  const bookDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diff = Math.floor((todayMsk.getTime() - bookDay.getTime()) / 86_400_000);
  if (diff === 1) return 'вчера';
  if (diff <= 4) return `${diff} дня назад`;
  return `${diff} дней назад`;
}

function fmtPhone(p: string): string {
  if (!p) return '';
  const d = p.replace(/\D/g, '');
  if (d.length === 11) return `+7 (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7,9)}-${d.slice(9,11)}`;
  return p;
}

export default function CheckinPage({ currentUser, onRefreshLeads }: Props) {
  const [items, setItems] = useState<CheckinLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [autoApplied, setAutoApplied] = useState(0);

  const isAdmin = currentUser.role === 'admin';

  const fetchAndAutoApply = useCallback(async () => {
    setLoading(true);
    setAutoApplied(0);
    try {
      const data = await api.checkin.list(currentUser.name, currentUser.role);

      // Auto-apply definitive Yclients statuses
      const definitive = data.filter(l =>
        l.yclientsAttendance === 1 || l.yclientsAttendance === -1
      );

      if (definitive.length > 0) {
        await Promise.allSettled(
          definitive.map(l => {
            const status = l.yclientsAttendance === 1 ? 'showed_up' : 'no_show';
            return api.checkin.quickUpdate(l.id!, { status });
          })
        );
        setAutoApplied(definitive.length);
        await onRefreshLeads();
      }

      // Only show items that still need manual review
      const remaining = data.filter(l =>
        l.yclientsAttendance !== 1 && l.yclientsAttendance !== -1
      );
      setItems(remaining);
    } catch { /* ignore */ }
    setLoading(false);
  }, [currentUser.name, currentUser.role, onRefreshLeads]);

  useEffect(() => { fetchAndAutoApply(); }, [fetchAndAutoApply]);

  const markBusy = (id: string) => setBusy(p => new Set(p).add(id));
  const unmarkBusy = (id: string) => setBusy(p => { const s = new Set(p); s.delete(id); return s; });

  const handleStatus = async (id: string, status: 'showed_up' | 'no_show' | 'cancelled') => {
    markBusy(id);
    try {
      await api.checkin.quickUpdate(id, { status });
      setConfirmed(p => new Set(p).add(id));
      setTimeout(() => {
        setItems(p => p.filter(l => l.id !== id));
        setConfirmed(p => { const s = new Set(p); s.delete(id); return s; });
      }, 600);
      await onRefreshLeads();
    } catch { /* ignore */ }
    unmarkBusy(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const visible = items.filter(l => !confirmed.has(l.id ?? ''));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-display font-bold text-neutral-950 uppercase tracking-widest">
            Проверка визитов
          </h2>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">
            {visible.length === 0
              ? 'Всё проверено'
              : `${visible.length} ${visible.length === 1 ? 'запись' : visible.length < 5 ? 'записи' : 'записей'} без данных Yclients`}
          </p>
        </div>
        <button
          onClick={fetchAndAutoApply}
          className="p-2.5 rounded-xl bg-white/50 border border-neutral-200/60 hover:bg-white transition-colors duration-150 shadow-sm cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
        </button>
      </div>

      {/* Auto-applied banner */}
      {autoApplied > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
            Автоматически отмечено по данным Yclients: {autoApplied} {autoApplied === 1 ? 'запись' : autoApplied < 5 ? 'записи' : 'записей'}
          </span>
        </div>
      )}

      {visible.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-xs font-bold text-neutral-950 uppercase tracking-widest">Все визиты проверены</p>
          <p className="text-[10px] text-neutral-400 font-medium">Записи с прошедшей датой отмечены</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map(lead => {
          const isBusy = busy.has(lead.id ?? '');
          const isConfirmed = confirmed.has(lead.id ?? '');

          return (
            <div
              key={lead.id}
              className={`rounded-2xl bg-white/60 border border-white/80 shadow-sm p-5 space-y-4 transition-opacity duration-500 ${isConfirmed ? 'opacity-0' : 'opacity-100'}`}
            >
              {/* Header: date + days ago */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    {fmtDate(lead.bookingDate)} · {daysAgo(lead.bookingDate)}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest truncate shrink-0">
                  {lead.managerName}
                </span>
              </div>

              {/* Client info */}
              <div className="space-y-1.5">
                <p className="font-bold text-neutral-950 text-sm leading-snug">{lead.clientName}</p>
                {lead.clientPhone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-neutral-300 shrink-0" />
                    <span className="text-[11px] text-neutral-500 font-medium">{fmtPhone(lead.clientPhone)}</span>
                  </div>
                )}
                {lead.city && (
                  <span className="text-[10px] text-neutral-400 font-medium">{lead.city}</span>
                )}
              </div>

              {/* Yclients / Yookassa info */}
              <div className="space-y-1.5">
                {lead.yclientsAttendance === 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                      Yclients: не подтверждён
                    </span>
                  </div>
                )}
                {lead.yclientsAttendance === 2 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
                    <AlertCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">
                      Yclients: запись отменена
                    </span>
                  </div>
                )}
                {lead.yclientsAttendance === null && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
                    <AlertCircle className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                      Нет данных в Yclients
                    </span>
                  </div>
                )}
                {lead.yookassaPaid ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-100">
                    <Banknote className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wide">
                      Предоплата: {lead.yookassaAmount ? `${lead.yookassaAmount.toLocaleString('ru')} ₽` : 'оплачено'}
                    </span>
                  </div>
                ) : lead.amocrmLeadId ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200">
                    <Banknote className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                      Предоплата не поступала
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Action buttons — admin override only */}
              {isAdmin && (
                <div className="flex gap-2.5 pt-1">
                  <button
                    disabled={isBusy}
                    onClick={() => handleStatus(lead.id!, 'showed_up')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    Пришёл
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => handleStatus(lead.id!, 'no_show')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-100 hover:bg-rose-50 text-neutral-600 hover:text-rose-600 border border-neutral-200/60 hover:border-rose-200 text-[10px] font-bold uppercase tracking-widest transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
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
