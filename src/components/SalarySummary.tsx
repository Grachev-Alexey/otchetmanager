import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CommissionRules, LeadReport, ManagerPerformance } from '../types';
import { Settings, Save, TrendingUp, Check, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api/client';

const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

interface SalarySummaryProps {
  leads: LeadReport[];
  rules: CommissionRules;
  onSaveRules: (newRules: CommissionRules) => Promise<boolean>;
  currentUserRole: 'admin' | 'manager';
  currentManagerName: string;
}

function fmtHours(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return `${m} мин`;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

function calcSalary(showUps: number, deposits: number, workedSecs: number, rules: CommissionRules): number {
  const over      = deposits > rules.poThreshold;
  const visitRate = over ? rules.perShowUpHigh : rules.perShowUpLow;
  const poRate    = over ? rules.perPoHigh     : rules.perPoLow;
  return showUps * visitRate + (workedSecs / 3600) * rules.hourlyRate + deposits * poRate;
}

function prevMonth(year: number, month: number): [number, number] {
  return month === 1 ? [year - 1, 12] : [year, month - 1];
}
function nextMonth(year: number, month: number): [number, number] {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}

export default function SalarySummary({
  leads, rules, onSaveRules, currentUserRole, currentManagerName
}: SalarySummaryProps) {
  const now = new Date();
  const [prevY, prevM] = prevMonth(now.getFullYear(), now.getMonth() + 1);

  const [selectedYear, setSelectedYear]   = useState(prevY);
  const [selectedMonth, setSelectedMonth] = useState(prevM);

  const [isEditingRules, setIsEditingRules] = useState(false);
  const [editedRules, setEditedRules]       = useState<CommissionRules>({ ...rules });
  const [saveLoading, setSaveLoading]       = useState(false);
  const [saveSuccess, setSaveSuccess]       = useState(false);
  const [monthlyHours, setMonthlyHours]     = useState<Record<string, number>>({});

  useEffect(() => {
    setEditedRules({ ...rules });
  }, [rules]);

  useEffect(() => {
    if (currentUserRole === 'admin') {
      api.shifts.monthlyAll(selectedYear, selectedMonth)
        .then(data => setMonthlyHours(data))
        .catch(() => {});
    } else {
      api.shifts.monthly(currentManagerName, selectedYear, selectedMonth)
        .then(({ totalSeconds }) => setMonthlyHours({ [currentManagerName]: totalSeconds }))
        .catch(() => {});
    }
  }, [currentUserRole, currentManagerName, selectedYear, selectedMonth]);

  const handleRuleChange = (field: keyof CommissionRules, val: number) => {
    setEditedRules(prev => ({ ...prev, [field]: isNaN(val) ? 0 : val }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    const isOk = await onSaveRules(editedRules);
    setSaveLoading(false);
    if (isOk) {
      setSaveSuccess(true);
      setTimeout(() => { setSaveSuccess(false); setIsEditingRules(false); }, 1500);
    }
  };

  const goToPrev = () => { const [y, m] = prevMonth(selectedYear, selectedMonth); setSelectedYear(y); setSelectedMonth(m); };
  const goToNext = () => {
    const [y, m] = nextMonth(selectedYear, selectedMonth);
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) return;
    setSelectedYear(y); setSelectedMonth(m);
  };

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  const isPrevMonthSelected = selectedYear === prevY && selectedMonth === prevM;

  // Filter leads by selected period
  const periodLeads = leads.filter(l => {
    if (!l.bookingDate) return false;
    const d = new Date(l.bookingDate);
    return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
  });

  const managers = currentUserRole === 'admin'
    ? Array.from(new Set(leads.map(l => l.managerName).filter(Boolean)))
    : [currentManagerName];

  const performances: ManagerPerformance[] = managers.map(managerName => {
    const ml            = periodLeads.filter(l => l.managerName === managerName);
    const totalBookings = ml.length;
    const totalDeposits = ml.filter(l => l.depositPaid).length;
    const totalShowUps  = ml.filter(l => l.status === 'showed_up').length;
    const totalNoShows  = ml.filter(l => l.status === 'no_show').length;
    const workedSeconds = monthlyHours[managerName] ?? 0;
    const earnedSalary  = calcSalary(totalShowUps, totalDeposits, workedSeconds, rules);
    return { managerName, totalBookings, totalDeposits, totalShowUps, totalNoShows, workedSeconds, earnedSalary, leads: ml };
  });

  const inputCls = "w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-150/60 rounded-xl text-neutral-900 font-semibold focus:border-neutral-900 focus:outline-hidden focus:bg-white transition-all duration-300 shadow-3xs";
  const labelCls = "block text-[8.5px] uppercase font-bold tracking-wider text-neutral-450 leading-none mb-1";
  const overThreshold = (deposits: number) => deposits > (rules.poThreshold ?? 140);

  return (
    <div className="space-y-6">

      {/* Period selector */}
      <div className="spatial-glass rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={goToPrev}
            className="p-2 rounded-xl border border-neutral-200/60 bg-white/60 hover:bg-neutral-950 hover:text-white text-neutral-600 transition duration-200 cursor-pointer shadow-sm">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[160px] text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-950">
              {MONTHS_RU[selectedMonth - 1]} {selectedYear}
            </p>
          </div>
          <button onClick={goToNext} disabled={isCurrentMonth}
            className="p-2 rounded-xl border border-neutral-200/60 bg-white/60 hover:bg-neutral-950 hover:text-white text-neutral-600 transition duration-200 cursor-pointer shadow-sm disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSelectedYear(prevY); setSelectedMonth(prevM); }}
            className={`px-3.5 py-2 text-[9.5px] font-bold uppercase tracking-wider rounded-xl border cursor-pointer transition duration-200 ${isPrevMonthSelected ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white/60 text-neutral-500 border-neutral-200/60 hover:border-neutral-950 hover:text-neutral-950'}`}
          >
            Прошлый месяц
          </button>
          <button
            onClick={() => { setSelectedYear(now.getFullYear()); setSelectedMonth(now.getMonth() + 1); }}
            className={`px-3.5 py-2 text-[9.5px] font-bold uppercase tracking-wider rounded-xl border cursor-pointer transition duration-200 ${isCurrentMonth ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white/60 text-neutral-500 border-neutral-200/60 hover:border-neutral-950 hover:text-neutral-950'}`}
          >
            Текущий месяц
          </button>
        </div>

        <div className="sm:ml-auto text-[9px] font-bold uppercase tracking-widest text-neutral-400">
          {periodLeads.length} {periodLeads.length === 1 ? 'запись' : periodLeads.length >= 2 && periodLeads.length <= 4 ? 'записи' : 'записей'} за период
        </div>
      </div>

      {/* Commission rules (admin only) */}
      {currentUserRole === 'admin' && (
        <div className="spatial-glass rounded-3xl overflow-hidden transition-all duration-300">
          <div className="p-5 flex items-center justify-between border-b border-neutral-150/40 relative z-10">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-neutral-500 animate-spin" style={{ animationDuration: '8s' }} />
              <h3 className="font-display font-semibold text-neutral-950 text-xs uppercase tracking-wider">
                Настройки расчёта зарплат
              </h3>
            </div>
            <button
              onClick={() => setIsEditingRules(!isEditingRules)}
              className="px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-950 bg-white/40 border border-neutral-200/60 rounded-xl transition-all duration-300 cursor-pointer shadow-3xs active:scale-95 hover:bg-white/80"
            >
              {isEditingRules ? 'Свернуть' : 'Редактировать'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {isEditingRules ? (
              <motion.form
                key="rules-editing"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleSave}
                className="p-6 border-t border-neutral-150/40 space-y-6 relative z-10"
              >
                {saveSuccess && (
                  <div className="p-3 bg-neutral-950 text-white text-[11px] font-bold rounded-xl text-center uppercase tracking-wider flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" /> Параметры обновлены
                  </div>
                )}

                <div className="p-4 bg-neutral-50 border border-neutral-150 rounded-2xl text-[10.5px] text-neutral-600 font-semibold leading-relaxed">
                  Формула: Визиты × ставка + Часы × {editedRules.hourlyRate}₽ + Предоплаты × ставка
                  <br />
                  <span className="text-neutral-400">Ставки повышаются если ПО &gt; {editedRules.poThreshold ?? 140}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-neutral-700">
                  <div className="space-y-1.5">
                    <label className={labelCls}>Порог ПО (шт)</label>
                    <input type="number" value={editedRules.poThreshold}
                      onChange={(e) => handleRuleChange('poThreshold', parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-150/60 rounded-xl text-neutral-900 font-semibold focus:border-neutral-900 focus:outline-hidden focus:bg-white transition-all duration-300 shadow-3xs" />
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelCls}>1 Визит (ПО &gt; порога, ₽)</label>
                    <div className="relative"><span className="absolute left-3.5 top-3 text-neutral-400 font-bold">₽</span>
                      <input type="number" value={editedRules.perShowUpHigh}
                        onChange={(e) => handleRuleChange('perShowUpHigh', parseInt(e.target.value))}
                        className={inputCls} /></div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelCls}>1 Визит (ПО ≤ порога, ₽)</label>
                    <div className="relative"><span className="absolute left-3.5 top-3 text-neutral-400 font-bold">₽</span>
                      <input type="number" value={editedRules.perShowUpLow}
                        onChange={(e) => handleRuleChange('perShowUpLow', parseInt(e.target.value))}
                        className={inputCls} /></div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelCls}>1 ПО (ПО &gt; порога, ₽)</label>
                    <div className="relative"><span className="absolute left-3.5 top-3 text-neutral-400 font-bold">₽</span>
                      <input type="number" value={editedRules.perPoHigh}
                        onChange={(e) => handleRuleChange('perPoHigh', parseInt(e.target.value))}
                        className={inputCls} /></div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelCls}>1 ПО (ПО ≤ порога, ₽)</label>
                    <div className="relative"><span className="absolute left-3.5 top-3 text-neutral-400 font-bold">₽</span>
                      <input type="number" value={editedRules.perPoLow}
                        onChange={(e) => handleRuleChange('perPoLow', parseInt(e.target.value))}
                        className={inputCls} /></div>
                  </div>

                  <div className="space-y-1.5">
                    <label className={labelCls}>1 час работы (₽)</label>
                    <div className="relative"><span className="absolute left-3.5 top-3 text-neutral-400 font-bold">₽</span>
                      <input type="number" value={editedRules.hourlyRate}
                        onChange={(e) => handleRuleChange('hourlyRate', parseInt(e.target.value))}
                        className={inputCls} /></div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3.5 pt-4 border-t border-neutral-150/40">
                  <button type="button" onClick={() => { setEditedRules({ ...rules }); setIsEditingRules(false); }}
                    className="px-5 py-3 bg-white/40 hover:bg-white/70 border border-neutral-200 text-neutral-600 rounded-xl text-[10.5px] uppercase tracking-wider font-bold transition-all duration-300 cursor-pointer active:scale-95">
                    Отмена
                  </button>
                  <button type="submit" disabled={saveLoading}
                    className="px-6 py-3 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-200 text-white rounded-xl text-[10.5px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all duration-300 shadow-sm active:scale-95">
                    <Save className="w-4 h-4" />
                    {saveLoading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="rules-overview"
                className="p-5 grid grid-cols-2 lg:grid-cols-6 gap-4 text-center border-t border-neutral-150/30 relative z-10"
              >
                {[
                  { label: 'Порог ПО', val: `${rules.poThreshold} шт` },
                  { label: 'Визит (выше)', val: `${rules.perShowUpHigh} ₽` },
                  { label: 'Визит (ниже)', val: `${rules.perShowUpLow} ₽` },
                  { label: 'ПО (выше)', val: `${rules.perPoHigh} ₽` },
                  { label: 'ПО (ниже)', val: `${rules.perPoLow} ₽` },
                  { label: '1 час работы', val: `${rules.hourlyRate} ₽` },
                ].map((s, i) => (
                  <div key={i} className="p-3.5 bg-neutral-50 rounded-2xl border border-white/50 flex flex-col justify-center shadow-3xs">
                    <p className="text-[8.5px] uppercase font-bold text-neutral-400 mb-1 tracking-wider leading-none">{s.label}</p>
                    <p className="font-semibold text-xs text-neutral-900 leading-none mt-1.5">{s.val}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Performance cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {performances.length === 0 ? (
          <div className="lg:col-span-2 spatial-glass rounded-3xl p-16 text-center text-xs text-neutral-450 font-medium tracking-wide">
            Нет данных за выбранный период
          </div>
        ) : performances.map((perf) => {
          const over      = overThreshold(perf.totalDeposits);
          const visitRate = over ? rules.perShowUpHigh : rules.perShowUpLow;
          const poRate    = over ? rules.perPoHigh     : rules.perPoLow;
          const hours     = perf.workedSeconds / 3600;

          return (
            <motion.div
              key={perf.managerName}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
              className="spatial-glass rounded-3xl p-6 shadow-3xs flex flex-col justify-between"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-150/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-display font-semibold text-sm shrink-0">
                      {perf.managerName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-neutral-950 text-sm leading-none">{perf.managerName}</h4>
                      <span className="text-[8.5px] text-neutral-400 font-extrabold uppercase tracking-widest block mt-1.5">
                        {MONTHS_RU[selectedMonth - 1]} {selectedYear}
                      </span>
                    </div>
                  </div>
                  <div className={`text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl border ${over ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white/60 text-neutral-500 border-neutral-200/50'}`}>
                    ПО: {perf.totalDeposits} {over ? `> ${rules.poThreshold ?? 140} ✓` : `≤ ${rules.poThreshold ?? 140}`}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Записи',     count: perf.totalBookings },
                    { label: 'Визиты',     count: perf.totalShowUps },
                    { label: 'Предоплаты', count: perf.totalDeposits },
                    { label: 'Пропуски',   count: perf.totalNoShows },
                  ].map((s, i) => (
                    <div key={i} className="p-2.5 bg-neutral-50 rounded-xl border border-white/50 shadow-4xs">
                      <span className="text-[8px] text-neutral-400 block font-bold uppercase tracking-wider leading-none">{s.label}</span>
                      <span className="font-bold text-xs block mt-2 text-neutral-900 leading-none">{s.count}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-neutral-50 rounded-xl border border-neutral-100">
                  <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="text-[10.5px] text-neutral-600 font-medium">Отработано за период:</span>
                  <span className="ml-auto font-bold text-neutral-900 text-[10.5px]">
                    {perf.workedSeconds > 0 ? fmtHours(perf.workedSeconds) : '—'}
                  </span>
                </div>

                <div className="space-y-2 pt-3 border-t border-neutral-150/40 text-[11px] text-neutral-500 font-semibold">
                  <div className="flex justify-between">
                    <span>Визиты ({perf.totalShowUps} × {visitRate} ₽):</span>
                    <span className="text-neutral-700">+{(perf.totalShowUps * visitRate).toLocaleString()} ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Часы работы ({hours.toFixed(1)} ч × {rules.hourlyRate} ₽):</span>
                    <span className="text-neutral-700">+{(hours * rules.hourlyRate).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Предоплаты ПО ({perf.totalDeposits} × {poRate} ₽):</span>
                    <span className="text-neutral-700">+{(perf.totalDeposits * poRate).toLocaleString()} ₽</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-neutral-150/40 pt-4 flex items-center justify-between">
                <div>
                  <span className="text-[8.5px] text-neutral-400 font-bold uppercase tracking-widest block">Итоговое начисление</span>
                  <p className="font-display text-xl font-bold text-neutral-950 tracking-tight mt-1">
                    {Math.round(perf.earnedSalary).toLocaleString()} ₽
                  </p>
                </div>
                <div className="p-2.5 border border-neutral-150/80 rounded-xl text-neutral-600 bg-neutral-50 shadow-3xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
