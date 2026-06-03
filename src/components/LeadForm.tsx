import React, { useState, useEffect } from 'react';
import { LeadReport, LeadStatus, StaffMember } from '../types';
import { Link, Calendar, Phone, User, FileText, Check, Save, X, Sparkles } from 'lucide-react';

interface LeadFormProps {
  initialLead?: LeadReport | null;
  onSave: (lead: LeadReport) => Promise<boolean>;
  onCancel?: () => void;
  currentUserRole: 'admin' | 'manager';
  currentManagerName: string;
}

export default function LeadForm({ 
  initialLead, 
  onSave, 
  onCancel, 
  currentUserRole, 
  currentManagerName 
}: LeadFormProps) {
  const [managerName, setManagerName] = useState(initialLead?.managerName || '');
  const [clientName, setClientName] = useState(initialLead?.clientName || '');
  const [clientPhone, setClientPhone] = useState(initialLead?.clientPhone || '');
  const [amocrmLeadId, setAmocrmLeadId] = useState(initialLead?.amocrmLeadId || '');
  const [bookingDate, setBookingDate] = useState(initialLead?.bookingDate || new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<LeadStatus>(initialLead?.status || 'booked');
  const [depositRequired, setDepositRequired] = useState(initialLead?.depositRequired || false);
  const [depositAmount, setDepositAmount] = useState(initialLead?.depositAmount || 0);
  const [depositPaid, setDepositPaid] = useState(initialLead?.depositPaid || false);
  const [comments, setComments] = useState(initialLead?.comments || '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  useEffect(() => {
    // Fetch active staff list dynamically from the database
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        const managersOnly = data.filter((u: StaffMember) => u.role === 'manager');
        setStaffList(managersOnly);
      })
      .catch(err => console.error('Error fetching staff list for form selector:', err));
  }, []);

  useEffect(() => {
    if (currentUserRole === 'manager') {
      setManagerName(currentManagerName);
    } else if (!initialLead) {
      setManagerName('');
    }
  }, [currentUserRole, currentManagerName, initialLead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    let finalManager = managerName;
    if (currentUserRole === 'manager') {
      finalManager = currentManagerName;
    }

    if (!finalManager || finalManager.trim() === '') {
      setError('Пожалуйста, выберите ответственного менеджера из списка');
      return;
    }
    if (!clientName || clientName.trim() === '') {
      setError('Имя клиента является обязательным полем');
      return;
    }
    if (!bookingDate) {
      setError('Укажите дату записи');
      return;
    }

    setIsLoading(true);

    const payload: LeadReport = {
      id: initialLead?.id,
      managerName: finalManager.trim(),
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
      amocrmLeadId: amocrmLeadId.trim(),
      bookingDate,
      status,
      depositRequired,
      depositAmount: depositRequired ? depositAmount : 0,
      depositPaid: depositRequired ? depositPaid : false,
      comments: comments.trim()
    };

    const isOk = await onSave(payload);
    setIsLoading(false);

    if (isOk) {
      setSuccess(true);
      if (!initialLead) {
        setClientName('');
        setClientPhone('');
        setAmocrmLeadId('');
        setDepositRequired(false);
        setDepositAmount(0);
        setDepositPaid(false);
        setComments('');
      }
      setTimeout(() => setSuccess(false), 2000);
    } else {
      setError('Сбой сохранения данных. Пожалуйста, попробуйте еще раз.');
    }
  };

  return (
    <div className="spatial-glass rounded-3xl p-7 relative overflow-hidden transition-all duration-300">
      {/* Dynamic backdrop glow accent */}
      <div className="absolute -right-20 -top-20 w-48 h-48 bg-neutral-200/40 rounded-full blur-3xl pointer-events-none" />
      
      {/* Header wrapper */}
      <div className="pb-5 border-b border-neutral-150/40 flex items-center justify-between gap-4 relative z-10">
        <div>
          <h4 className="font-display font-semibold text-neutral-950 text-sm uppercase tracking-wider flex items-center gap-2">
            <span>{initialLead ? '🖋️ Редактирование записи' : '📝 Карточка записи и предоплаты'}</span>
          </h4>
          <p className="text-[11px] text-neutral-450 mt-1 font-medium">Регистрация визитов, статуса записи и внесенных предоплат</p>
        </div>
        
        {onCancel && (
          <button 
            type="button" 
            onClick={onCancel}
            className="p-2 rounded-xl border border-neutral-200/60 bg-white/40 text-neutral-400 hover:text-neutral-850 hover:bg-white/80 transition-all duration-200 cursor-pointer shadow-3xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs text-neutral-700 pt-6 relative z-10">
        {error && (
          <div className="p-3 bg-neutral-950 text-white text-[11px] rounded-xl font-semibold text-center tracking-wide shadow-2xs">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-500/10 backdrop-blur-xs border border-emerald-500/20 text-emerald-800 text-[11px] rounded-xl font-semibold flex items-center gap-2.5 shadow-3xs">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Запись успешно сохранена!</span>
          </div>
        )}

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manager Input Selector */}
          <div className="space-y-1.5">
            <label className="block text-neutral-400 font-bold uppercase tracking-wider text-[8.5px] leading-none mb-1">Ответственный менеджер *</label>
            {currentUserRole === 'admin' ? (
              <select
                id="form-manager-select"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full text-xs font-semibold px-4 py-3 bg-white/40 backdrop-blur-md border border-neutral-150/60 focus:border-neutral-900 focus:bg-white/80 focus:outline-hidden text-neutral-900 cursor-pointer rounded-xl transition-all duration-300 shadow-3xs hover:bg-white/65"
              >
                <option value="">-- Выбрать сотрудника --</option>
                {staffList.map(pm => (
                  <option key={pm.name} value={pm.name}>{pm.name}</option>
                ))}
                {staffList.length === 0 && (
                  <>
                    <option value="Алина К.">Алина К.</option>
                    <option value="Иван П.">Иван П.</option>
                    <option value="Маргарита Д.">Маргарита Д.</option>
                    <option value="Сергей В.">Сергей В.</option>
                  </>
                )}
                <option value="custom">Новый сотрудник вручную...</option>
              </select>
            ) : (
              <div className="px-4 py-3 bg-white/50 backdrop-blur-md border border-neutral-150/40 rounded-xl text-neutral-850 font-semibold flex items-center justify-between shadow-3xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  👤 {currentManagerName}
                </span>
                <span className="text-[8px] bg-neutral-950 text-white px-2 py-0.5 rounded-lg font-bold uppercase tracking-widest leading-none">
                  Сессия
                </span>
              </div>
            )}
            
            {currentUserRole === 'admin' && managerName === 'custom' && (
              <input
                id="custom-manager-input"
                type="text"
                placeholder="ФИО сотрудника"
                value={managerName === 'custom' ? '' : managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-neutral-150/60 rounded-xl mt-2 focus:border-neutral-900 focus:bg-white/80 focus:outline-hidden text-neutral-900 font-medium transition-all duration-300 shadow-3xs hover:bg-white/65"
              />
            )}
          </div>

          {/* Client Name Input */}
          <div className="space-y-1.5">
            <label className="block text-neutral-400 font-bold uppercase tracking-wider text-[8.5px] leading-none mb-1">ФИО Клиента *</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
              <input
                id="client-name-input"
                type="text"
                placeholder="Имя клиента..."
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/40 backdrop-blur-md border border-neutral-150/60 focus:border-neutral-900 focus:bg-white/80 focus:outline-hidden text-neutral-900 font-semibold rounded-xl transition-all duration-300 shadow-3xs hover:bg-white/65"
              />
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Mobile Number */}
          <div className="space-y-1.5">
            <label className="block text-neutral-400 font-bold uppercase tracking-wider text-[8.5px] leading-none mb-1">Номер телефона клиента</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
              <input
                id="client-phone-input"
                type="tel"
                placeholder="+7 (___) ___-__-__"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/40 backdrop-blur-md border border-neutral-150/60 focus:border-neutral-900 focus:bg-white/80 focus:outline-hidden text-neutral-900 font-semibold rounded-xl transition-all duration-300 shadow-3xs hover:bg-white/65"
              />
            </div>
          </div>

          {/* AmoCRM Deal Identifier */}
          <div className="space-y-1.5">
            <label className="block text-neutral-400 font-bold uppercase tracking-wider text-[8.5px] leading-none mb-1">ID Сделки AmoCRM *</label>
            <div className="relative">
              <Link className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
              <input
                id="amocrm-leadid-input"
                type="text"
                placeholder="Например: 42398510"
                value={amocrmLeadId}
                onChange={(e) => setAmocrmLeadId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/40 backdrop-blur-md border border-neutral-150/60 focus:border-neutral-900 focus:bg-white/80 focus:outline-hidden text-neutral-900 font-mono font-semibold rounded-xl transition-all duration-300 shadow-3xs hover:bg-white/65"
              />
            </div>
          </div>
        </div>

        {/* Date and Status Option */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Booking Date */}
          <div className="space-y-1.5">
            <label className="block text-neutral-400 font-bold uppercase tracking-wider text-[8.5px] leading-none mb-1">Дата записи *</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
              <input
                id="booking-date-input"
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/40 backdrop-blur-md border border-neutral-150/60 focus:border-neutral-900 focus:bg-white/80 focus:outline-hidden text-neutral-900 font-semibold rounded-xl transition-all duration-300 shadow-3xs hover:bg-white/65"
              />
            </div>
          </div>

          {/* Lead Status Select */}
          <div className="space-y-1.5">
            <label className="block text-neutral-400 font-bold uppercase tracking-wider text-[8.5px] leading-none mb-1">Текущий статус записи</label>
            <select
              id="status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as LeadStatus)}
              className="w-full px-4 py-3 bg-white/40 backdrop-blur-md border border-neutral-150/60 focus:border-neutral-900 focus:bg-white/80 focus:outline-hidden text-neutral-950 font-semibold rounded-xl cursor-pointer transition-all duration-300 shadow-3xs hover:bg-white/65"
            >
              <option value="booked">📅 Зарегистрирована запись</option>
              <option value="rescheduled">🔄 Запись перенесена</option>
              <option value="showed_up">✅ Визит состоялся</option>
              <option value="no_show">❌ Неявка</option>
              <option value="cancelled">🚫 Запись отменена</option>
            </select>
          </div>
        </div>

        {/* Prepayments subsection */}
        <div className="bg-white/35 backdrop-blur-md border border-neutral-200/50 p-5 rounded-2xl space-y-4 shadow-3xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <label className="flex items-center gap-3 text-neutral-800 font-semibold select-none cursor-pointer">
              <input
                id="deposit-required-checkbox"
                type="checkbox"
                checked={depositRequired}
                onChange={(e) => {
                  setDepositRequired(e.target.checked);
                  if (!e.target.checked) {
                    setDepositAmount(0);
                    setDepositPaid(false);
                  }
                }}
                className="w-4 h-4 rounded-md border-neutral-300/80 text-neutral-950 focus:ring-neutral-900 bg-white/80 cursor-pointer transition-all duration-150"
              />
              Требуется предоплата клиента
            </label>

            {depositRequired && (
              <label className="flex items-center gap-3 text-neutral-800 font-semibold select-none cursor-pointer">
                <input
                  id="deposit-paid-checkbox"
                  type="checkbox"
                  checked={depositPaid}
                  onChange={(e) => setDepositPaid(e.target.checked)}
                  className="w-4 h-4 rounded-md border-neutral-300/80 text-neutral-850 focus:ring-neutral-900 bg-white/80 cursor-pointer transition-all duration-150"
                />
                Предоплата внесена и зафиксирована
              </label>
            )}
          </div>

          {depositRequired && (
            <div className="pt-2 max-w-xs space-y-1.5">
              <label className="block text-neutral-400 font-bold uppercase tracking-wider text-[8.5px] leading-none mb-1">Размер внесенной предоплаты (₽)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-neutral-500 font-bold text-xs">₽</span>
                <input
                  id="deposit-amount-input"
                  type="number"
                  placeholder="2500"
                  value={depositAmount || ''}
                  onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-2.5 bg-white/40 backdrop-blur-md border border-neutral-150/60 focus:border-neutral-900 focus:bg-white/80 focus:outline-hidden text-neutral-900 font-semibold rounded-xl shadow-3xs transition-all duration-300 hover:bg-white/60"
                />
              </div>
            </div>
          )}
        </div>

        {/* Comment Section */}
        <div className="space-y-1.5">
          <label className="block text-neutral-400 font-bold uppercase tracking-wider text-[8.5px] leading-none mb-1">Примечания и комментарии к клиенту</label>
          <div className="relative">
            <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
            <textarea
              id="comments-textarea"
              rows={2}
              placeholder="Примечания (например, 'Просит позвонить заранее для подтверждения визита')"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/40 backdrop-blur-md border border-neutral-150/60 focus:border-neutral-900 focus:bg-white/80 focus:outline-hidden text-neutral-950 font-semibold text-xs rounded-xl transition-all duration-300 shadow-3xs hover:bg-white/65"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-4 border-t border-neutral-150/50 flex items-center justify-end gap-3.5 font-semibold">
          {onCancel && (
            <button
              id="form-cancel-btn"
              type="button"
              onClick={onCancel}
              className="px-5 py-3 bg-white/40 hover:bg-white/70 active:scale-95 border border-neutral-200 text-neutral-600 hover:text-neutral-950 rounded-xl transition-all duration-300 cursor-pointer text-[10.5px] uppercase tracking-wider font-bold shadow-3xs"
            >
              Отмена
            </button>
          )}
          <button
            id="form-submit-btn"
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold uppercase tracking-widest rounded-xl transition-all duration-350 flex items-center gap-2 cursor-pointer text-[10.5px] shadow-sm hover:scale-[1.01] active:scale-[0.98]"
          >
            <Check className="w-4 h-4" />
            {isLoading ? 'Сохранение...' : (initialLead ? 'Сохранить изменения' : 'Внести запись')}
          </button>
        </div>
      </form>
    </div>
  );
}
