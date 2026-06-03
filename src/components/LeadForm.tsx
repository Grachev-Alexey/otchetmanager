import React, { useState, useEffect, useRef } from 'react';
import { LeadReport, LeadStatus, StaffMember } from '../types';
import { Phone, User, FileText, Check, X, ChevronDown, Link2, Loader2, Search, ChevronLeft, ChevronRight, MapPin, DollarSign } from 'lucide-react';

interface LeadFormProps {
  initialLead?: LeadReport | null;
  onSave: (lead: LeadReport) => Promise<boolean>;
  onCancel?: () => void;
  currentUserRole: 'admin' | 'manager';
  currentManagerName: string;
  staffList: StaffMember[];
}

const CITIES = [
  'Санкт-Петербург (Садовая)',
  'Санкт-Петербург (Пионерская)',
  'Екатеринбург',
  'Новосибирск',
  'Омск',
  'Уфа',
];

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

function parseDateStr(str: string): Date | null {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatDisplayDate(str: string): string {
  const d = parseDateStr(str);
  if (!d) return 'Выберите дату';
  return `${String(d.getDate()).padStart(2,'0')} ${MONTHS_RU[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;
}

function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  const selected = parseDateStr(value);
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : today.getMonth());

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  let startDow = firstDay.getDay() - 1; if (startDow < 0) startDow = 6;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-neutral-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none rounded-xl transition-colors duration-150 text-sm cursor-pointer"
      >
        <span className={selected ? 'text-neutral-900 font-medium' : 'text-neutral-300'}>
          {formatDisplayDate(value)}
        </span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-neutral-100 rounded-2xl shadow-xl p-4 w-72">
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
            {DAYS_RU.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-neutral-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const dateStr = toDateStr(new Date(viewYear, viewMonth, day));
              const isSelected = value === dateStr;
              const isToday = toDateStr(today) === dateStr;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onChange(dateStr); setOpen(false); }}
                  className={`text-xs font-medium rounded-lg py-1.5 transition-colors duration-100 cursor-pointer
                    ${isSelected ? 'bg-indigo-600 text-white' :
                      isToday ? 'bg-indigo-50 text-indigo-700 font-bold' :
                      'hover:bg-neutral-100 text-neutral-700'}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-neutral-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none rounded-xl transition-colors duration-150 text-sm cursor-pointer"
        style={icon ? { paddingLeft: '2.5rem' } : {}}
      >
        {icon && (
          <span className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400 pointer-events-none">
            {icon}
          </span>
        )}
        <span className={value ? 'text-neutral-900 font-medium' : 'text-neutral-300'}>
          {value || placeholder || '— Выбрать —'}
        </span>
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-150 shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-neutral-100 rounded-2xl shadow-xl py-1.5 w-full min-w-max">
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-neutral-300 hover:bg-neutral-50 transition-colors duration-100 cursor-pointer"
            >
              {placeholder}
            </button>
          )}
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors duration-100 cursor-pointer flex items-center justify-between gap-3
                ${value === opt
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-neutral-700 hover:bg-neutral-50'}`}
            >
              {opt}
              {value === opt && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function extractAmocrmId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/leads\/detail\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return '';
}

export default function LeadForm({ initialLead, onSave, onCancel, currentUserRole, currentManagerName, staffList }: LeadFormProps) {
  const [amocrmUrl, setAmocrmUrl] = useState('');
  const [amocrmLeadId, setAmocrmLeadId] = useState(initialLead?.amocrmLeadId || '');
  const [clientName, setClientName] = useState(initialLead?.clientName || '');
  const [clientPhone, setClientPhone] = useState(initialLead?.clientPhone || '');
  const [bookingDate, setBookingDate] = useState(initialLead?.bookingDate || new Date().toISOString().split('T')[0]);
  const [city, setCity] = useState(initialLead?.city || '');
  const [depositRequired, setDepositRequired] = useState(initialLead?.depositRequired || false);
  const [depositAmount, setDepositAmount] = useState(initialLead?.depositAmount || 300);
  const [visitCost, setVisitCost] = useState(initialLead?.visitCost ?? 2090);
  const [comments, setComments] = useState(initialLead?.comments || '');

  const [isLoading, setIsLoading] = useState(false);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const lookupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialLead) setAmocrmUrl(initialLead.amocrmLeadId || '');
  }, [initialLead]);

  const handleAmocrmUrlChange = (value: string) => {
    setAmocrmUrl(value);
    const extracted = extractAmocrmId(value);
    setAmocrmLeadId(extracted);
    if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
    if (!extracted) { setLookupState('idle'); return; }
    setLookupState('loading');
    lookupTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leads/lookup?amocrmId=${extracted}`);
        const data = await res.json();
        if (data.found) {
          setClientName(data.clientName || '');
          setClientPhone(data.clientPhone || '');
          setLookupState('found');
        } else {
          setLookupState('not_found');
        }
      } catch { setLookupState('not_found'); }
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!clientName.trim()) { setError('Введите имя клиента'); return; }
    if (!bookingDate) { setError('Укажите дату записи'); return; }
    setIsLoading(true);
    const payload: LeadReport = {
      id: initialLead?.id,
      managerName: currentManagerName,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      amocrmLeadId: amocrmLeadId.trim(),
      bookingDate,
      status: initialLead?.status || 'booked' as LeadStatus,
      city: city.trim(),
      depositRequired,
      depositAmount: depositRequired ? depositAmount : 0,
      depositPaid: initialLead?.depositPaid || false,
      visitCost,
      comments: comments.trim(),
    };
    const isOk = await onSave(payload);
    setIsLoading(false);
    if (isOk) {
      setSuccess(true);
      if (!initialLead) {
        setAmocrmUrl(''); setAmocrmLeadId(''); setClientName('');
        setClientPhone(''); setCity(''); setDepositRequired(false);
        setDepositAmount(300); setVisitCost(2090); setComments(''); setLookupState('idle');
      }
      setTimeout(() => setSuccess(false), 2000);
    } else {
      setError('Не удалось сохранить запись. Попробуйте ещё раз.');
    }
  };

  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5";
  const inputClass = "w-full px-4 py-3 bg-white border border-neutral-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-neutral-900 font-medium rounded-xl transition-colors duration-150 text-sm placeholder:text-neutral-300";
  const inputWithIconClass = "w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-neutral-900 font-medium rounded-xl transition-colors duration-150 text-sm placeholder:text-neutral-300";
  const iconClass = "absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400";

  return (
    <div className="p-7">
      {/* Header */}
      <div className="pb-5 border-b border-neutral-100 flex items-center justify-between gap-4">
        <h4 className="font-display font-bold text-neutral-900 text-base flex items-center gap-2">
          <span className="text-xl">{initialLead ? '🖋️' : '📝'}</span>
          <span>{initialLead ? 'Редактирование записи' : 'Карточка записи'}</span>
        </h4>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="p-2 rounded-xl border border-neutral-100 text-neutral-400 hover:text-neutral-700 hover:border-neutral-200 hover:bg-neutral-50 transition-colors duration-150 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 pt-5">
        {error && <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl font-semibold text-center">{error}</div>}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Запись успешно сохранена!</span>
          </div>
        )}

        {/* AmoCRM URL */}
        <div>
          <label className={labelClass}>Ссылка на сделку AmoCRM *</label>
          <div className="relative">
            <Link2 className={iconClass} />
            <input type="text"
              placeholder="Вставьте ссылку на сделку или ID..."
              value={amocrmUrl}
              onChange={(e) => handleAmocrmUrlChange(e.target.value)}
              className={`${inputWithIconClass} pr-10`} />
            <div className="absolute right-3.5 top-3.5">
              {lookupState === 'loading' && <Loader2 className="w-4 h-4 text-neutral-400 animate-spin" />}
              {lookupState === 'found' && <Check className="w-4 h-4 text-emerald-500" />}
              {lookupState === 'not_found' && <Search className="w-4 h-4 text-neutral-300" />}
            </div>
          </div>
          {amocrmLeadId && (
            <p className="mt-1.5 text-[11px] text-neutral-400 font-mono">
              ID: <span className="font-bold text-neutral-600">{amocrmLeadId}</span>
            </p>
          )}
          {lookupState === 'found' && <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Клиент найден — данные подставлены</p>}
          {lookupState === 'not_found' && amocrmLeadId && <p className="mt-1 text-[11px] text-neutral-400">Новый клиент — заполните вручную</p>}
        </div>

        {/* Client name + phone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>ФИО Клиента *</label>
            <div className="relative">
              <User className={iconClass} />
              <input type="text" placeholder="Имя клиента..." value={clientName}
                onChange={(e) => setClientName(e.target.value)} className={inputWithIconClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Номер телефона</label>
            <div className="relative">
              <Phone className={iconClass} />
              <input type="tel" placeholder="+7 (___) ___-__-__" value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)} className={inputWithIconClass} />
            </div>
          </div>
        </div>

        {/* Date + City */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Дата записи *</label>
            <DatePicker value={bookingDate} onChange={setBookingDate} />
          </div>
          <div>
            <label className={labelClass}>Город</label>
            <CustomSelect
              value={city}
              onChange={setCity}
              options={CITIES}
              placeholder="— Выбрать город —"
              icon={<MapPin className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Visit cost */}
        <div className="max-w-xs">
          <label className={labelClass}>Стоимость визита (₽)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-neutral-400 font-bold text-sm">₽</span>
            <input
              type="number"
              value={visitCost || ''}
              onChange={(e) => setVisitCost(parseInt(e.target.value) || 0)}
              className="w-full pl-8 pr-4 py-3 bg-white border border-neutral-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-neutral-900 font-semibold rounded-xl transition-colors duration-150 text-sm"
            />
          </div>
        </div>

        {/* Deposit */}
        <div className="bg-neutral-50 border border-neutral-100 p-4 rounded-2xl">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input type="checkbox" checked={depositRequired}
                onChange={(e) => setDepositRequired(e.target.checked)} className="sr-only peer" />
              <div className="w-5 h-5 rounded-md border-2 border-neutral-300 bg-white peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-colors duration-150 flex items-center justify-center">
                {depositRequired && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <span className="text-sm font-semibold text-neutral-700">Предоплата</span>
          </label>

          {depositRequired && (
            <div className="mt-4 max-w-xs">
              <label className={labelClass}>Сумма (₽)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-neutral-400 font-bold text-sm">₽</span>
                <input type="number" placeholder="300" value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-3 bg-white border border-neutral-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-neutral-900 font-semibold rounded-xl transition-colors duration-150 text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* Comments */}
        <div>
          <label className={labelClass}>Примечания</label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
            <textarea rows={2} placeholder=""
              value={comments} onChange={(e) => setComments(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-neutral-900 font-medium rounded-xl transition-colors duration-150 text-sm placeholder:text-neutral-300 resize-none" />
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="px-5 py-2.5 bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 rounded-xl transition-colors duration-150 cursor-pointer text-xs font-bold uppercase tracking-wider">
              Отмена
            </button>
          )}
          <button type="submit" disabled={isLoading}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 text-white font-bold uppercase tracking-widest rounded-xl transition-colors duration-150 flex items-center gap-2 cursor-pointer text-xs shadow-sm shadow-indigo-200">
            <Check className="w-4 h-4" />
            {isLoading ? 'Сохранение...' : (initialLead ? 'Сохранить' : 'Внести запись')}
          </button>
        </div>
      </form>
    </div>
  );
}
