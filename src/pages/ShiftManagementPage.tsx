import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Plus, Edit3, Trash2, StopCircle,
  Clock, Coffee, Check, X, AlertCircle, Loader2, Users
} from 'lucide-react';
import { api } from '../api/client';
import type { ShiftSession, StaffMember } from '../types';

interface Props {
  allUsers: StaffMember[];
}

function todayMsk(): string {
  return new Date().toLocaleDateString('sv', { timeZone: 'Europe/Moscow' });
}

function mskTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow',
  });
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
}

function prevDay(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  dt.setDate(dt.getDate() - 1);
  return dt.toLocaleDateString('sv');
}
function nextDay(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  dt.setDate(dt.getDate() + 1);
  return dt.toLocaleDateString('sv');
}

function calcWorkedSecs(s: ShiftSession): number {
  const end = s.endedAt ? new Date(s.endedAt).getTime() : Date.now();
  const gross = end - new Date(s.startedAt).getTime();
  const breaks = s.totalBreakSecs * 1000
    + (s.breakStartedAt ? Date.now() - new Date(s.breakStartedAt).getTime() : 0);
  return Math.max(0, Math.floor((gross - breaks) / 1000));
}

function fmtSecs(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m} мин`;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

// Local date+time string → ISO for the server (treat as Moscow time)
function localToISO(dateStr: string, timeStr: string): string {
  // Build a Date in Moscow timezone via toLocaleString trick
  const combined = `${dateStr}T${timeStr}:00`;
  // We send it as-is and let the server handle it; just ensure it's a valid ISO
  const d = new Date(combined);
  return d.toISOString();
}

function isoToLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow',
  });
}

// ── Session Edit/Create Modal ──────────────────────────────────────────────
interface SessionFormData {
  managerName: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMins: string;
}

interface SessionModalProps {
  session?: ShiftSession | null;
  date: string;
  managers: string[];
  onSave: (data: SessionFormData) => Promise<void>;
  onClose: () => void;
}

function SessionModal({ session, date, managers, onSave, onClose }: SessionModalProps) {
  const isEdit = !!session;
  const [form, setForm] = useState<SessionFormData>(() => ({
    managerName: session?.managerName || (managers[0] ?? ''),
    date,
    startTime: session ? isoToLocalTime(session.startedAt) : '09:00',
    endTime: session?.endedAt ? isoToLocalTime(session.endedAt) : '18:00',
    breakMins: session ? String(Math.round(session.totalBreakSecs / 60)) : '0',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof SessionFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.managerName) return setError('Выберите менеджера');
    if (!form.startTime) return setError('Укажите время начала');
    setSaving(true);
    try {
      await onSave(form);
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const labelCls = 'block text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5';
  const inputCls = 'w-full px-3.5 py-2.5 bg-white border border-neutral-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-neutral-900 font-medium rounded-xl text-sm transition-colors duration-150';

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        className="relative bg-white rounded-2xl shadow-2xl border border-neutral-100 w-full max-w-md"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-display font-bold text-neutral-900 text-sm">
            {isEdit ? 'Редактировать смену' : 'Добавить смену'}
          </h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {!isEdit && (
            <div>
              <label className={labelCls}>Менеджер</label>
              <select value={form.managerName} onChange={set('managerName')} className={inputCls}>
                {managers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Дата</label>
              <input type="date" value={form.date} onChange={set('date')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Начало смены</label>
              <input type="time" value={form.startTime} onChange={set('startTime')} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Конец смены</label>
              <input type="time" value={form.endTime} onChange={set('endTime')} className={inputCls} placeholder="Если не закончена" />
            </div>
            <div>
              <label className={labelCls}>Перерыв (мин)</label>
              <input type="number" min="0" value={form.breakMins} onChange={set('breakMins')} className={inputCls} />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer">
              Отмена
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-200 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function ShiftManagementPage({ allUsers }: Props) {
  const [date, setDate]           = useState(todayMsk());
  const [sessions, setSessions]   = useState<ShiftSession[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSession, setEditSession] = useState<ShiftSession | null>(null);
  const [deleting, setDeleting]   = useState<number | null>(null);
  const [closing, setClosing]     = useState<number | null>(null);
  const [tick, setTick]           = useState(0);

  const managers = allUsers.filter(u => u.role === 'manager').map(u => u.name);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const data = await api.shifts.adminSessions(d);
      setSessions(data);
    } catch { setSessions([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  // Tick every 10s to refresh elapsed for open sessions
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const grouped = sessions.reduce<Record<string, ShiftSession[]>>((acc, s) => {
    if (!acc[s.managerName]) acc[s.managerName] = [];
    acc[s.managerName].push(s);
    return acc;
  }, {});

  const handleSave = async (form: SessionFormData) => {
    const startedAt = localToISO(form.date, form.startTime);
    const endedAt   = form.endTime ? localToISO(form.date, form.endTime) : undefined;
    const totalBreakSecs = parseInt(form.breakMins || '0') * 60;

    if (editSession) {
      await api.shifts.adminUpdate(editSession.id, { startedAt, endedAt, totalBreakSecs });
    } else {
      await api.shifts.adminCreate({ managerName: form.managerName, startedAt, endedAt, totalBreakSecs });
    }
    setModalOpen(false);
    setEditSession(null);
    await load(date);
  };

  const handleClose = async (id: number) => {
    setClosing(id);
    try {
      await api.shifts.adminClose(id);
      await load(date);
    } catch { /* ignore */ }
    finally { setClosing(null); }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await api.shifts.adminDelete(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const isToday = date === todayMsk();
  const isFuture = date > todayMsk();

  return (
    <div className="space-y-6">

      {/* Date navigation */}
      <div className="spatial-glass rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(prevDay(date))}
            className="p-2 rounded-xl border border-neutral-200/60 bg-white/60 hover:bg-neutral-950 hover:text-white text-neutral-600 transition duration-200 cursor-pointer shadow-sm">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[220px] text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-950 capitalize">
              {fmtDate(date)}
            </p>
          </div>
          <button
            onClick={() => !isFuture && setDate(nextDay(date))}
            disabled={isToday}
            className="p-2 rounded-xl border border-neutral-200/60 bg-white/60 hover:bg-neutral-950 hover:text-white text-neutral-600 transition duration-200 cursor-pointer shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(todayMsk())}
            className={`px-3.5 py-2 text-[9.5px] font-bold uppercase tracking-wider rounded-xl border cursor-pointer transition duration-200 ${isToday ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white/60 text-neutral-500 border-neutral-200/60 hover:border-neutral-950 hover:text-neutral-950'}`}
          >
            Сегодня
          </button>
        </div>

        <div className="sm:ml-auto flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">
            {sessions.length} {sessions.length === 1 ? 'сессия' : sessions.length >= 2 && sessions.length <= 4 ? 'сессии' : 'сессий'}
          </span>
          <button
            onClick={() => { setEditSession(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 text-white text-[9.5px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Добавить смену
          </button>
        </div>
      </div>

      {/* Sessions */}
      {loading ? (
        <div className="spatial-glass rounded-2xl p-12 text-center">
          <Loader2 className="w-6 h-6 text-neutral-400 animate-spin mx-auto" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="spatial-glass rounded-3xl p-14 text-center">
          <Clock className="w-8 h-8 text-neutral-300 mx-auto mb-3" />
          <p className="text-xs font-bold text-neutral-700 uppercase tracking-widest">Смен не найдено</p>
          <p className="text-[11px] text-neutral-400 mt-2 font-medium">За этот день нет записей о сменах</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([managerName, managerSessions]) => {
            const totalWorked = managerSessions.reduce((sum, s) => sum + calcWorkedSecs(s), 0);

            return (
              <motion.div
                key={managerName}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="spatial-glass rounded-2xl overflow-hidden shadow-3xs"
              >
                {/* Manager header */}
                <div className="px-5 py-3.5 border-b border-neutral-100/60 flex items-center justify-between bg-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-neutral-950 text-white flex items-center justify-center font-display font-semibold text-xs shrink-0">
                      {managerName.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold text-neutral-900">{managerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Итого:</span>
                    <span className="text-[11px] font-bold text-neutral-800">{fmtSecs(totalWorked)}</span>
                  </div>
                </div>

                {/* Sessions list */}
                <div className="divide-y divide-neutral-100/50">
                  {managerSessions.map(s => {
                    const isOpen    = !s.endedAt;
                    const isBreak   = isOpen && !!s.breakStartedAt;
                    const worked    = calcWorkedSecs(s);
                    const breakMins = Math.round(s.totalBreakSecs / 60);

                    return (
                      <div key={s.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">

                        {/* Time range */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isBreak ? 'bg-amber-400' : isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-300'}`} />

                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-semibold text-neutral-800">
                                {mskTime(s.startedAt)} — {s.endedAt ? mskTime(s.endedAt) : <span className={isBreak ? 'text-amber-600' : 'text-emerald-600'}>{isBreak ? 'Перерыв' : 'Активна'}</span>}
                              </span>
                              {isOpen && (
                                <span className={`text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${isBreak ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                  {isBreak ? <><Coffee className="w-2.5 h-2.5 inline mr-1" />Перерыв</> : 'На смене'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-medium">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {fmtSecs(worked)}
                              </span>
                              {breakMins > 0 && (
                                <span className="flex items-center gap-1">
                                  <Coffee className="w-3 h-3" />
                                  Перерыв: {breakMins} мин
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isOpen && (
                            <button
                              onClick={() => handleClose(s.id)}
                              disabled={closing === s.id}
                              title="Завершить смену"
                              className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200/60 bg-white/50 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-neutral-500 text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-40"
                            >
                              {closing === s.id
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <StopCircle className="w-3 h-3" />}
                              Закрыть
                            </button>
                          )}
                          <button
                            onClick={() => { setEditSession(s); setModalOpen(true); }}
                            title="Редактировать"
                            className="p-2 border border-neutral-200/60 bg-white/50 hover:bg-neutral-950 hover:text-white text-neutral-400 rounded-xl transition-all duration-200 cursor-pointer shadow-3xs active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={deleting === s.id}
                            title="Удалить"
                            className="p-2 border border-neutral-200/60 bg-white/50 hover:bg-rose-500 hover:text-white text-neutral-400 rounded-xl transition-all duration-200 cursor-pointer shadow-3xs active:scale-95 disabled:opacity-40"
                          >
                            {deleting === s.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <SessionModal
            session={editSession}
            date={date}
            managers={managers.length > 0 ? managers : allUsers.map(u => u.name)}
            onSave={handleSave}
            onClose={() => { setModalOpen(false); setEditSession(null); }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
