import React, { useState, useEffect, useRef } from 'react';
import { LeadReport, LeadStatus, StaffMember } from '../types';
import { Phone, User, FileText, Check, X, Link2, Loader2, Search } from 'lucide-react';
import { SingleDatePicker, FormSelect } from './ui';

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

function extractAmocrmId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/leads\/detail\/(\d+)/);
  if (urlMatch) return urlMatch[1];
  if (/^\d+$/.test(trimmed)) return trimmed;
  return '';
}

export default function LeadForm({
  initialLead, onSave, onCancel, currentUserRole, currentManagerName, staffList,
}: LeadFormProps) {
  const [amocrmUrl,    setAmocrmUrl]    = useState('');
  const [amocrmLeadId, setAmocrmLeadId] = useState(initialLead?.amocrmLeadId || '');
  const [clientName,   setClientName]   = useState(initialLead?.clientName  || '');
  const [clientPhone,  setClientPhone]  = useState(initialLead?.clientPhone || '');

  const [bookingDate, setBookingDate] = useState(() => {
    const raw = initialLead?.bookingDate;
    if (!raw) return new Date().toLocaleDateString('sv', { timeZone: 'Europe/Moscow' });
    return String(raw).slice(0, 10);
  });

  const [city,       setCity]       = useState(initialLead?.city      || '');
  const [isReferral, setIsReferral] = useState(initialLead?.isReferral || false);
  const [visitCost,  setVisitCost]  = useState(initialLead?.visitCost  ?? 2090);
  const [comments,   setComments]   = useState(initialLead?.comments  || '');

  const [isLoading,   setIsLoading]   = useState(false);
  const [lookupState, setLookupState] = useState<'idle'|'loading'|'found'|'not_found'>('idle');
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);
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
        const res  = await fetch(`/api/leads/lookup?amocrmId=${extracted}`);
        const data = await res.json();
        if (data.found) {
          setClientName(data.clientName  || '');
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
    setError(''); setSuccess(false);
    if (!clientName.trim()) { setError('Введите имя клиента'); return; }
    if (!bookingDate)        { setError('Укажите дату записи');  return; }
    setIsLoading(true);
    const payload: LeadReport = {
      id:           initialLead?.id,
      managerName:  initialLead ? initialLead.managerName : currentManagerName,
      clientName:   clientName.trim(),
      clientPhone:  clientPhone.trim(),
      amocrmLeadId: amocrmLeadId.trim(),
      bookingDate,
      status:       initialLead?.status || 'booked' as LeadStatus,
      city:         city.trim(),
      depositRequired: initialLead?.depositRequired ?? false,
      depositAmount:   initialLead?.depositAmount   ?? 0,
      depositPaid:     initialLead?.depositPaid     ?? false,
      isReferral,
      visitCost,
      comments: comments.trim(),
    };
    const isOk = await onSave(payload);
    setIsLoading(false);
    if (isOk) {
      setSuccess(true);
      if (!initialLead) {
        setAmocrmUrl(''); setAmocrmLeadId(''); setClientName('');
        setClientPhone(''); setCity(''); setIsReferral(false);
        setVisitCost(2090); setComments(''); setLookupState('idle');
      }
      setTimeout(() => setSuccess(false), 2000);
    } else {
      setError('Не удалось сохранить запись. Попробуйте ещё раз.');
    }
  };

  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5";
  const inputWithIconClass = "w-full pl-10 pr-4 py-2.5 bg-white/80 border border-neutral-200/70 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 focus:outline-none text-neutral-900 font-semibold rounded-xl transition-colors duration-150 text-xs placeholder:text-neutral-300 shadow-3xs";
  const iconClass = "absolute left-3.5 top-2.5 w-3.5 h-3.5 text-neutral-400";

  return (
    <div className="p-7">
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
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl font-semibold text-center">{error}</div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Запись успешно сохранена!</span>
          </div>
        )}

        {/* AmoCRM */}
        <div>
          <label className={labelClass}>Ссылка на сделку AmoCRM</label>
          <div className="relative">
            <Link2 className={iconClass} />
            <input type="text" placeholder="Вставьте ссылку или ID сделки..."
              value={amocrmUrl} onChange={(e) => handleAmocrmUrlChange(e.target.value)}
              className={`${inputWithIconClass} pr-10`} />
            <div className="absolute right-3.5 top-2.5">
              {lookupState === 'loading'   && <Loader2 className="w-3.5 h-3.5 text-neutral-400 animate-spin" />}
              {lookupState === 'found'     && <Check   className="w-3.5 h-3.5 text-emerald-500" />}
              {lookupState === 'not_found' && <Search  className="w-3.5 h-3.5 text-neutral-300" />}
            </div>
          </div>
          {amocrmLeadId && <p className="mt-1.5 text-[11px] text-neutral-400 font-mono">ID: <span className="font-bold text-neutral-600">{amocrmLeadId}</span></p>}
          {lookupState === 'found'     && <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Клиент найден — данные подставлены</p>}
          {lookupState === 'not_found' && amocrmLeadId && <p className="mt-1 text-[11px] text-neutral-400">Новый клиент — заполните вручную</p>}
        </div>

        {/* Name + Phone */}
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
            <SingleDatePicker value={bookingDate} onChange={setBookingDate} />
          </div>
          <div>
            <label className={labelClass}>Город</label>
            <FormSelect value={city} onChange={setCity} options={CITIES} placeholder="— Выбрать город —" />
          </div>
        </div>

        {/* Visit cost */}
        <div className="max-w-xs">
          <label className={labelClass}>Стоимость визита (₽)</label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-neutral-400 font-bold text-xs pointer-events-none">₽</span>
            <input type="number" value={visitCost || ''}
              onChange={(e) => setVisitCost(parseInt(e.target.value) || 0)}
              className="w-full pl-8 pr-4 py-2.5 bg-white/80 border border-neutral-200/70 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 focus:outline-none text-neutral-900 font-semibold rounded-xl transition-colors duration-150 text-xs shadow-3xs" />
          </div>
        </div>

        {/* Referral */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit group">
          <div className="relative shrink-0">
            <input type="checkbox" checked={isReferral} onChange={(e) => setIsReferral(e.target.checked)} className="sr-only peer" />
            <div className="w-4 h-4 rounded border-2 border-neutral-300 bg-white peer-checked:bg-amber-500 peer-checked:border-amber-500 transition-colors duration-150 flex items-center justify-center">
              {isReferral && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
          </div>
          <span className="text-xs font-semibold text-neutral-500 group-hover:text-neutral-700 transition-colors">По рекомендации</span>
        </label>

        {/* Comments */}
        <div>
          <label className={labelClass}>Примечания</label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-2.5 w-3.5 h-3.5 text-neutral-400" />
            <textarea rows={2} placeholder="" value={comments} onChange={(e) => setComments(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-neutral-200/70 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 focus:outline-none text-neutral-900 font-semibold rounded-xl transition-colors duration-150 text-xs placeholder:text-neutral-300 resize-none shadow-3xs" />
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-3">
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="px-5 py-2.5 bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 rounded-xl transition-colors duration-150 cursor-pointer text-[10px] font-bold uppercase tracking-wider">
              Отмена
            </button>
          )}
          <button type="submit" disabled={isLoading}
            className="px-6 py-2.5 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold uppercase tracking-widest rounded-xl transition-colors duration-150 flex items-center gap-2 cursor-pointer text-[10px] shadow-sm">
            <Check className="w-3.5 h-3.5" />
            {isLoading ? 'Сохранение...' : (initialLead ? 'Сохранить изменения' : 'Внести запись')}
          </button>
        </div>
      </form>
    </div>
  );
}
