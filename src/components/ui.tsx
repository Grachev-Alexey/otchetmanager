/**
 * Shared UI components used across pages.
 * FilterDatePicker — range date picker (portal, same style as in LeadList)
 * SingleDatePicker — single-date picker (portal)
 * PortalSelect     — custom portal dropdown (replaces native <select>)
 */
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const MONTHS_RU    = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MONTHS_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const DAYS_SHORT   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

export function parseDateStr(str: string): Date | null {
  if (!str) return null;
  const s = String(str).slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function todayLocal(): string {
  return new Date().toLocaleDateString('sv');
}
function fmtDateShort(str: string): string {
  const d = parseDateStr(str);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function buildCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/* ══════════════════════════════════════════════
   FilterDatePicker — range picker with portal
══════════════════════════════════════════════ */
export function FilterDatePicker({
  valueFrom, valueTo, onChange, label,
}: {
  valueFrom: string;
  valueTo: string;
  onChange: (from: string, to: string) => void;
  label: string;
}) {
  const [open, setOpen]           = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos]             = useState({ top: 0, left: 0 });
  const today = todayLocal();

  const initDate = parseDateStr(valueFrom) || new Date();
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const updatePos = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left });
    }
  };

  const handleOpen = () => {
    if (!open) { updatePos(); setSelecting(null); setHoverDate(null); }
    setOpen(o => !o);
  };
  const handleClose = () => { setOpen(false); setSelecting(null); setHoverDate(null); };

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(t) && dropRef.current && !dropRef.current.contains(t)) handleClose();
    }
    function onScroll() { updatePos(); }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); }

  const handleDayClick = (dateStr: string) => {
    if (!selecting) {
      setSelecting(dateStr);
    } else {
      const from = selecting < dateStr ? selecting : dateStr;
      const to   = selecting < dateStr ? dateStr : selecting;
      onChange(from, to);
      setSelecting(null); setHoverDate(null); setOpen(false);
    }
  };

  const rangeFrom  = selecting || valueFrom;
  const rangeTo    = selecting ? (hoverDate || '') : valueTo;
  const isActive   = !!(valueFrom || valueTo);
  const cells      = buildCells(viewYear, viewMonth);

  const displayLabel = (() => {
    if (selecting) return `${fmtDateShort(selecting)} →`;
    if (!valueFrom) return 'Все';
    if (!valueTo || valueFrom === valueTo) return fmtDateShort(valueFrom);
    return `${fmtDateShort(valueFrom)} — ${fmtDateShort(valueTo)}`;
  })();

  return (
    <div className="relative flex items-center">
      <button
        ref={btnRef} type="button" onClick={handleOpen}
        className={`text-xs pl-3 pr-7 py-2 border rounded-xl focus:outline-hidden cursor-pointer shadow-3xs transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
          isActive ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white/60 hover:bg-white border-neutral-200/70 text-neutral-700'
        }`}
      >
        <CalendarDays className={`w-3 h-3 shrink-0 ${isActive ? 'text-white/70' : 'text-neutral-400'}`} />
        <span className={`font-medium ${isActive ? 'text-white/70' : 'text-neutral-400'}`}>{label}</span>
        <span className={isActive ? 'text-white/40' : 'text-neutral-300'}>·</span>
        <span className="font-bold">{displayLabel}</span>
      </button>
      <ChevronDown className={`absolute right-2 w-3 h-3 pointer-events-none ${isActive ? 'text-white/60' : 'text-neutral-400'}`} />

      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-neutral-100 rounded-2xl shadow-2xl p-4 w-72"
        >
          <div className="flex gap-2 mb-3 pb-3 border-b border-neutral-100">
            <button type="button" onClick={() => { onChange('', ''); setSelecting(null); handleClose(); }}
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                !valueFrom && !valueTo && !selecting ? 'bg-neutral-950 text-white' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 border border-neutral-200'
              }`}>
              Все записи
            </button>
            <button type="button" onClick={() => {
                const d = parseDateStr(today) || new Date();
                setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
                onChange(today, today); setSelecting(null); handleClose();
              }}
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                valueFrom === today && valueTo === today ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-100'
              }`}>
              Сегодня
            </button>
          </div>

          <div className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-400 h-4">
            {selecting ? 'Выберите конечную дату' : 'Выберите начальную дату'}
          </div>

          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4 text-neutral-500" />
            </button>
            <span className="text-sm font-bold text-neutral-800">{MONTHS_RU[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer">
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS_SHORT.map(d => <div key={d} className="text-center text-[10px] font-bold text-neutral-400 py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = toDateStr(new Date(viewYear, viewMonth, day));
              const ef = rangeFrom < rangeTo ? rangeFrom : rangeTo;
              const et = rangeFrom < rangeTo ? rangeTo   : rangeFrom;
              const isStart   = dateStr === ef && !!ef;
              const isEnd     = dateStr === et && !!et && et !== ef;
              const isInRange = !!ef && !!et && dateStr > ef && dateStr < et;
              const isToday   = today === dateStr;
              return (
                <button key={i} type="button"
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => selecting && setHoverDate(dateStr)}
                  onMouseLeave={() => selecting && setHoverDate(null)}
                  className={`text-xs font-medium py-1.5 transition-colors duration-75 cursor-pointer relative ${
                    isStart || isEnd
                      ? 'bg-indigo-600 text-white font-bold rounded-lg'
                      : isInRange
                        ? 'bg-indigo-50 text-indigo-700 rounded-none'
                        : isToday
                          ? 'bg-neutral-100 text-neutral-800 font-bold rounded-lg'
                          : 'hover:bg-neutral-100 text-neutral-700 rounded-lg'
                  }`}
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

/* ══════════════════════════════════════════════
   SingleDatePicker — single date, portal
══════════════════════════════════════════════ */
export function SingleDatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const today = todayLocal();
  const parsed = parseDateStr(value);
  const [viewYear,  setViewYear]  = useState(parsed ? parsed.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth()    : new Date().getMonth());

  const updatePos = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left });
    }
  };
  const handleOpen = () => { if (!open) updatePos(); setOpen(o => !o); };

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(t) && dropRef.current && !dropRef.current.contains(t)) setOpen(false);
    }
    function onScroll() { updatePos(); }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  useEffect(() => {
    const d = parseDateStr(value);
    if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
  }, [value]);

  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); }

  const cells      = buildCells(viewYear, viewMonth);
  const isActive   = !!value;
  const displayLabel = value ? fmtDateShort(value) : 'Выберите дату';

  return (
    <div className="relative flex items-center">
      <button
        ref={btnRef} type="button" onClick={handleOpen}
        className={`w-full text-xs pl-3 pr-8 py-2.5 border rounded-xl focus:outline-hidden cursor-pointer shadow-3xs transition-all duration-150 flex items-center gap-2 ${
          isActive ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/80 hover:bg-white border-neutral-200/70 text-neutral-600'
        }`}
      >
        <CalendarDays className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-indigo-200' : 'text-neutral-400'}`} />
        <span className={`font-bold truncate ${isActive ? 'text-white' : 'text-neutral-700'}`}>{displayLabel}</span>
      </button>
      <ChevronDown className={`absolute right-2.5 w-3 h-3 pointer-events-none ${isActive ? 'text-white/60' : 'text-neutral-400'}`} />

      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-white border border-neutral-100 rounded-2xl shadow-2xl p-4 w-72"
        >
          <div className="flex gap-2 mb-3 pb-3 border-b border-neutral-100">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                !value ? 'bg-neutral-950 text-white' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 border border-neutral-200'
              }`}>
              Очистить
            </button>
            <button type="button" onClick={() => {
                onChange(today);
                const d = parseDateStr(today);
                if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
                setOpen(false);
              }}
              className={`flex-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                value === today ? 'bg-indigo-600 text-white' : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-100'
              }`}>
              Сегодня
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"><ChevronLeft className="w-4 h-4 text-neutral-500" /></button>
            <span className="text-sm font-bold text-neutral-800">{MONTHS_RU[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"><ChevronRight className="w-4 h-4 text-neutral-500" /></button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAYS_SHORT.map(d => <div key={d} className="text-center text-[10px] font-bold text-neutral-400 py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr    = toDateStr(new Date(viewYear, viewMonth, day));
              const isSelected = String(value).slice(0, 10) === dateStr;
              const isToday    = today === dateStr;
              return (
                <button key={i} type="button"
                  onClick={() => { onChange(dateStr); setOpen(false); }}
                  className={`text-xs font-medium py-1.5 transition-colors duration-75 cursor-pointer rounded-lg ${
                    isSelected ? 'bg-indigo-600 text-white font-bold' : isToday ? 'bg-neutral-100 text-neutral-800 font-bold' : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
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

/* ══════════════════════════════════════════════
   PortalSelect — custom dropdown with portal
   allLabel: label shown for empty/all value
   activeClass: extra classes when value !== allValue
══════════════════════════════════════════════ */
export function PortalSelect({
  value, onChange, options, allLabel = 'Все', allValue = 'all', className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel?: string;
  allValue?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 });

  const updatePos = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 160) });
    }
  };
  const handleOpen = () => { if (!open) updatePos(); setOpen(o => !o); };

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(t) && dropRef.current && !dropRef.current.contains(t)) setOpen(false);
    }
    function onScroll() { updatePos(); }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  const isActive       = value !== allValue && value !== '';
  const selectedLabel  = isActive ? (options.find(o => o.value === value)?.label ?? value) : allLabel;

  return (
    <div className={`relative flex items-center ${className}`}>
      <button
        ref={btnRef} type="button" onClick={handleOpen}
        className={`text-[10px] font-bold pl-3 pr-7 py-2 border rounded-xl focus:outline-none cursor-pointer shadow-3xs transition-all duration-150 whitespace-nowrap ${
          isActive ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white/60 hover:bg-white border-neutral-200/70 text-neutral-600'
        }`}
      >
        {selectedLabel}
      </button>
      <ChevronDown className={`absolute right-2 w-3 h-3 pointer-events-none transition-transform duration-150 ${open ? 'rotate-180' : ''} ${isActive ? 'text-white/60' : 'text-neutral-400'}`} />

      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 9999 }}
          className="bg-white border border-neutral-100 rounded-2xl shadow-2xl py-1.5 overflow-hidden"
        >
          <button type="button"
            onClick={() => { onChange(allValue); setOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-xs transition-colors duration-100 cursor-pointer flex items-center justify-between gap-3 ${
              !isActive ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-neutral-500 font-medium hover:bg-neutral-50'
            }`}
          >
            <span>{allLabel}</span>
            {!isActive && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
          </button>
          {options.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors duration-100 cursor-pointer flex items-center justify-between gap-3 ${
                value === opt.value ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-neutral-700 font-medium hover:bg-neutral-50'
              }`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
            </button>
          ))}
        </div>
      , document.body)}
    </div>
  );
}

/* ══════════════════════════════════════════════
   FormSelect — portal dropdown for form fields
   (shows placeholder when empty, styled for form)
══════════════════════════════════════════════ */
export function FormSelect({
  value, onChange, options, placeholder = '— Выбрать —',
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos]   = useState({ top: 0, left: 0, width: 0 });

  const updatePos = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
  };
  const handleOpen = () => { if (!open) updatePos(); setOpen(o => !o); };

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(t) && dropRef.current && !dropRef.current.contains(t)) setOpen(false);
    }
    function onScroll() { updatePos(); }
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('scroll', onScroll, true); };
  }, [open]);

  const isActive = !!value;

  return (
    <div className="relative">
      <button
        ref={btnRef} type="button" onClick={handleOpen}
        className={`w-full text-xs pl-4 pr-8 py-2.5 border rounded-xl focus:outline-none cursor-pointer shadow-3xs transition-all duration-150 flex items-center text-left ${
          isActive ? 'bg-white/80 border-neutral-300 text-neutral-900' : 'bg-white/80 hover:bg-white border-neutral-200/70 text-neutral-400'
        }`}
      >
        <span className={`font-semibold truncate flex-1 ${isActive ? 'text-neutral-900' : 'text-neutral-400'}`}>
          {value || placeholder}
        </span>
      </button>
      <ChevronDown className={`absolute right-2.5 top-2.5 w-3.5 h-3.5 pointer-events-none transition-transform duration-150 ${open ? 'rotate-180' : ''} ${isActive ? 'text-neutral-500' : 'text-neutral-400'}`} />

      {open && createPortal(
        <div
          ref={dropRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="bg-white border border-neutral-100 rounded-2xl shadow-2xl py-1.5 overflow-hidden"
        >
          <button type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-xs text-neutral-400 hover:bg-neutral-50 transition-colors duration-100 cursor-pointer font-medium"
          >
            {placeholder}
          </button>
          {options.map(opt => (
            <button key={opt} type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-xs transition-colors duration-100 cursor-pointer flex items-center justify-between gap-3 ${
                value === opt ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-neutral-700 font-medium hover:bg-neutral-50'
              }`}
            >
              <span>{opt}</span>
              {value === opt && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
            </button>
          ))}
        </div>
      , document.body)}
    </div>
  );
}
