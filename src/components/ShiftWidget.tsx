import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Coffee, StopCircle } from 'lucide-react';
import { api } from '../api/client';
import type { ShiftSession } from '../types';

interface Props { managerName: string; }
type ShiftState = 'idle' | 'active' | 'on_break';

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmt(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function mskHHMM(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow',
  });
}

export default function ShiftWidget({ managerName }: Props) {
  const [state, setState]     = useState<ShiftState>('idle');
  const [session, setSession] = useState<ShiftSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [breakSec, setBreakSec] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);

  // ref keeps the latest priorSecs so closures always see the correct value
  const priorSecsRef = useRef(0);
  const tickRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTick = useCallback((s: ShiftSession) => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const now    = Date.now();
      const gross  = now - new Date(s.startedAt).getTime();
      const breaks = s.totalBreakSecs * 1000
        + (s.breakStartedAt ? now - new Date(s.breakStartedAt).getTime() : 0);
      setElapsed(priorSecsRef.current + Math.max(0, Math.floor((gross - breaks) / 1000)));
      setBreakSec(s.breakStartedAt
        ? Math.floor((now - new Date(s.breakStartedAt).getTime()) / 1000) : 0);
    }, 1000);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.shifts.active(managerName)
      .then(({ active, session: s, todayPriorSeconds }) => {
        const prior = todayPriorSeconds ?? 0;
        priorSecsRef.current = prior;
        setElapsed(prior);
        if (active && s) {
          setSession(s);
          setState(s.breakStartedAt ? 'on_break' : 'active');
          startTick(s);
        } else {
          setState('idle');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managerName]);

  const startShift = async () => {
    setBusy(true);
    try {
      const { session: s } = await api.shifts.start(managerName);
      const pseudo = s ?? {
        id: 0, managerName, startedAt: new Date().toISOString(),
        endedAt: null, breakStartedAt: null, totalBreakSecs: 0,
      };
      setSession(pseudo);
      startTick(pseudo);  // priorSecsRef.current is always up-to-date
      setState('active');
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const endShift = async () => {
    setBusy(true);
    try {
      const { workedSeconds } = await api.shifts.end(managerName);
      if (tickRef.current) clearInterval(tickRef.current);
      const newPrior = priorSecsRef.current + (workedSeconds ?? 0);
      priorSecsRef.current = newPrior;
      setElapsed(newPrior);
      setState('idle');
      setSession(null);
      setBreakSec(0);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const startBreak = async () => {
    setBusy(true);
    try {
      await api.shifts.breakStart(managerName);
      if (session) {
        const u = { ...session, breakStartedAt: new Date().toISOString() };
        setSession(u);
        startTick(u);
      }
      setState('on_break');
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const endBreak = async () => {
    setBusy(true);
    try {
      await api.shifts.breakEnd(managerName);
      if (session) {
        const addSecs = session.breakStartedAt
          ? Math.floor((Date.now() - new Date(session.breakStartedAt).getTime()) / 1000) : 0;
        const u = { ...session, breakStartedAt: null, totalBreakSecs: session.totalBreakSecs + addSecs };
        setSession(u);
        startTick(u);
      }
      setState('active');
      setBreakSec(0);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  if (loading) return <div className="mx-5 mb-1 h-10 rounded-xl bg-neutral-100/50 animate-pulse" />;

  // ── IDLE ─────────────────────────────────────────────────────────────────
  if (state === 'idle') return (
    <div className="px-5 mb-1 space-y-2">
      {elapsed > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200/60 shadow-3xs">
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Сегодня отработано</span>
          <span className="font-mono text-[11px] font-bold text-neutral-700 tabular-nums">{fmt(elapsed)}</span>
        </div>
      )}
      <button
        onClick={startShift} disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200/70 bg-white/50 hover:bg-white hover:border-neutral-300 text-neutral-500 hover:text-neutral-700 text-[10px] font-bold uppercase tracking-widest transition-all duration-150 cursor-pointer active:scale-[0.98] disabled:opacity-40 shadow-3xs"
      >
        <Play className="w-3 h-3" />
        {elapsed > 0 ? 'Продолжить смену' : 'Начать смену'}
      </button>
    </div>
  );

  // ── ACTIVE ────────────────────────────────────────────────────────────────
  if (state === 'active') return (
    <div className="px-5 mb-1 space-y-2">
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/50 border border-neutral-200/60 shadow-3xs">
        <div className="flex items-center gap-2">
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full w-2 h-2 bg-emerald-500" />
          </span>
          <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-neutral-700">На смене</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-neutral-900 tabular-nums">{fmt(elapsed)}</span>
      </div>
      {session && (
        <p className="text-[9px] text-neutral-400 text-center font-medium">
          сессия с {mskHHMM(session.startedAt)} МСК
        </p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={startBreak} disabled={busy}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-neutral-200/70 bg-white/50 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 text-neutral-500 text-[9px] font-bold uppercase tracking-widest transition-all duration-150 cursor-pointer active:scale-[0.98] disabled:opacity-40"
        >
          <Coffee className="w-3 h-3" />
          Перерыв
        </button>
        <button
          onClick={endShift} disabled={busy}
          className="flex items-center justify-center gap-1.5 py-2 rounded-xl border border-neutral-200/70 bg-white/50 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-neutral-500 text-[9px] font-bold uppercase tracking-widest transition-all duration-150 cursor-pointer active:scale-[0.98] disabled:opacity-40"
        >
          <StopCircle className="w-3 h-3" />
          Завершить
        </button>
      </div>
    </div>
  );

  // ── ON BREAK ──────────────────────────────────────────────────────────────
  return (
    <div className="px-5 mb-1 space-y-2">
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/50 border border-amber-200/60 shadow-3xs">
        <div className="flex items-center gap-2">
          <Coffee className="w-3 h-3 text-amber-500" />
          <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-neutral-600">Перерыв</span>
        </div>
        <span className="font-mono text-[11px] font-bold text-amber-600 tabular-nums">{fmt(breakSec)}</span>
      </div>
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[9px] text-neutral-400 font-medium">Всего сегодня</span>
        <span className="font-mono text-[10px] font-bold text-neutral-600 tabular-nums">{fmt(elapsed)}</span>
      </div>
      <button
        onClick={endBreak} disabled={busy}
        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-neutral-200/70 bg-white/50 hover:bg-white hover:border-neutral-300 text-neutral-500 hover:text-neutral-700 text-[9px] font-bold uppercase tracking-widest transition-all duration-150 cursor-pointer active:scale-[0.98] disabled:opacity-40 shadow-3xs"
      >
        <Play className="w-3 h-3" />
        Вернуться к работе
      </button>
    </div>
  );
}
