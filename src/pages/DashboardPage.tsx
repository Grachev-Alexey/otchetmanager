import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Award, Activity, Sliders, CornerDownRight, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LeadReport, CommissionRules, StaffMember } from '../types';
import { api } from '../api/client';

type ActiveMenu = 'dashboard' | 'leads' | 'salary' | 'staff_directory' | 'user_management';

interface Props {
  leads: LeadReport[];
  rules: CommissionRules;
  allUsers: StaffMember[];
  currentUser: StaffMember;
  onNavigate: (menu: ActiveMenu) => void;
}

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function calcSalary(showUps: number, totalDeposits: number, weightedDeposits: number, workedSecs: number, rules: CommissionRules): number {
  const over      = totalDeposits > (rules.poThreshold ?? 140);
  const visitRate = over ? rules.perShowUpHigh : rules.perShowUpLow;
  const poRate    = over ? rules.perPoHigh     : rules.perPoLow;
  return showUps * visitRate + (workedSecs / 3600) * rules.hourlyRate + weightedDeposits * poRate;
}

function fmtHours(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return `${m} мин`;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

function prevMonth(year: number, month: number): [number, number] {
  return month === 1 ? [year - 1, 12] : [year, month - 1];
}
function nextMonth(year: number, month: number): [number, number] {
  return month === 12 ? [year + 1, 1] : [year, month + 1];
}

function filterByMonth(leads: LeadReport[], year: number, month: number): LeadReport[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return leads.filter(l => l.bookingDate && String(l.bookingDate).slice(0, 7) === prefix);
}

export default function DashboardPage({ leads, rules, allUsers, currentUser, onNavigate }: Props) {
  const now = new Date();
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  const [prevY, prevM] = prevMonth(now.getFullYear(), now.getMonth() + 1);
  const isPrevMonth = selectedYear === prevY && selectedMonth === prevM;

  const goToPrev = () => { const [y, m] = prevMonth(selectedYear, selectedMonth); setSelectedYear(y); setSelectedMonth(m); };
  const goToNext = () => {
    const [y, m] = nextMonth(selectedYear, selectedMonth);
    if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth() + 1)) return;
    setSelectedYear(y); setSelectedMonth(m);
  };

  const myLeads    = currentUser.role === 'admin' ? leads : leads.filter(l => l.managerName === currentUser.name);
  const monthLeads = filterByMonth(myLeads, selectedYear, selectedMonth);

  // Stats for the selected period
  const totalCount       = monthLeads.length;
  const showUps          = monthLeads.filter(l => l.status === 'showed_up').length;
  const regularDeposits  = monthLeads.filter(l => (l.yookassaPaid || l.status === 'showed_up') && !l.isReferral).length;
  const referralDeposits = monthLeads.filter(l => (l.yookassaPaid || l.status === 'showed_up') && l.isReferral).length;
  const deposits         = regularDeposits + referralDeposits;
  const weightedDeposits = regularDeposits + referralDeposits * 2;
  const depositSum       = monthLeads.reduce((s, l) => s + (l.yookassaPaid ? (l.yookassaAmount || 0) : 0), 0);
  const noShows          = monthLeads.filter(l => l.status === 'no_show').length;
  const arrivalRate      = totalCount > 0 ? (showUps / totalCount) * 100 : 0;
  const noShowRate       = totalCount > 0 ? Math.round((noShows / totalCount) * 100) : 0;

  const [workedSecs, setWorkedSecs] = useState(0);
  const [allHours, setAllHours]     = useState<Record<string, number>>({});

  useEffect(() => {
    if (currentUser.role === 'manager') {
      api.shifts.monthly(currentUser.name, selectedYear, selectedMonth)
        .then(({ totalSeconds }) => setWorkedSecs(totalSeconds))
        .catch(() => {});
    } else {
      api.shifts.monthlyAll(selectedYear, selectedMonth)
        .then(data => setAllHours(data))
        .catch(() => {});
    }
  }, [currentUser, selectedYear, selectedMonth]);

  const salary = calcSalary(showUps, deposits, weightedDeposits, workedSecs, rules);
  const overPo = deposits > (rules.poThreshold ?? 140);

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
            className={`px-3.5 py-2 text-[9.5px] font-bold uppercase tracking-wider rounded-xl border cursor-pointer transition duration-200 ${isPrevMonth ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white/60 text-neutral-500 border-neutral-200/60 hover:border-neutral-950 hover:text-neutral-950'}`}
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
          {totalCount} {totalCount === 1 ? 'запись' : totalCount >= 2 && totalCount <= 4 ? 'записи' : 'записей'} за период
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 leading-none">Записей зарегистрировано</span>
              <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <p className="text-3xl font-display font-bold text-neutral-950 tracking-tight leading-none">{totalCount}</p>
              <span className="text-[10.5px] text-neutral-400 font-bold uppercase tracking-wider">за период</span>
            </div>
          </div>
          <div className="mt-5 border-t border-neutral-100/40 pt-3 flex items-center justify-between text-[10.5px] text-neutral-500 font-medium">
            <span>{MONTHS_RU[selectedMonth - 1]} {selectedYear}</span>
          </div>
        </div>

        <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 leading-none">Визиты состоялись</span>
              <CheckCircle2 className="w-4 h-4 text-neutral-400 animate-pulse" />
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <p className="text-3xl font-display font-bold text-neutral-950 tracking-tight leading-none">{showUps}</p>
              <span className="text-[10.5px] text-neutral-400 font-bold uppercase tracking-wider">клиентов</span>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-[9.5px] text-neutral-400 mb-1.5 font-bold uppercase tracking-wide">
              <span>Процент прихода</span>
              <span className="font-extrabold text-neutral-950 bg-white/70 px-1.5 py-0.5 rounded-md border border-neutral-100/40 font-mono shadow-sm">{Math.round(arrivalRate)}%</span>
            </div>
            <div className="w-full bg-neutral-200/50 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-neutral-950 rounded-full transition-all duration-500" style={{ width: `${arrivalRate}%` }} />
            </div>
          </div>
        </div>

        <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 leading-none">Предоплаты клиентов</span>
              <Award className="w-4 h-4 text-amber-500 animate-bounce" />
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <p className="text-2xl font-display font-bold text-neutral-950 tracking-tight leading-none">{deposits} шт.</p>
              <span className="text-[8px] text-neutral-600 bg-white/70 border border-neutral-200 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest leading-none shadow-sm">подтверждено</span>
            </div>
          </div>
          <div className="mt-5 border-t border-neutral-100/40 pt-3 flex items-center justify-between text-[10.5px] text-neutral-500 font-medium">
            <span>На общую сумму:</span>
            <span className="font-bold text-neutral-950 text-xs">{depositSum.toLocaleString()} ₽</span>
          </div>
        </div>

        <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 leading-none">Не пришли</span>
              <Activity className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <p className="text-3xl font-display font-bold text-neutral-950 tracking-tight leading-none">{noShows}</p>
              <span className="text-[10.5px] text-neutral-400 font-bold uppercase tracking-wider">пропусков</span>
            </div>
          </div>
          <div className="mt-5 border-t border-neutral-100/40 pt-3 flex items-center justify-between text-[10.5px] text-neutral-500 font-medium">
            <span>Отношение пропусков</span>
            <span className="font-bold text-red-600 bg-red-50/50 border border-red-100/50 px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider">{noShowRate}% потерь</span>
          </div>
        </div>
      </div>

      {/* Manager: personal salary */}
      {currentUser.role === 'manager' && (
        <div className="spatial-glass rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100/40">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-950">
              Моя зарплата — {MONTHS_RU[selectedMonth - 1]} {selectedYear}
            </h3>
            <div className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider self-start sm:self-auto ${overPo ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' : 'bg-neutral-100 text-neutral-400 border border-neutral-200/60'}`}>
              {overPo ? `ПО > ${rules.poThreshold} — повышенная ставка` : `ПО ≤ ${rules.poThreshold} — базовая ставка`}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-5">
            <div>
              <p className="text-[8.5px] uppercase font-bold tracking-widest text-neutral-400 leading-none">Визиты</p>
              <p className="text-xl font-display font-bold text-neutral-950 mt-2">
                +{(showUps * (overPo ? rules.perShowUpHigh : rules.perShowUpLow)).toLocaleString()} ₽
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">{showUps} × {overPo ? rules.perShowUpHigh : rules.perShowUpLow} ₽</p>
            </div>
            <div>
              <p className="text-[8.5px] uppercase font-bold tracking-widest text-neutral-400 leading-none">Предоплаты (ПО)</p>
              <p className="text-xl font-display font-bold text-neutral-950 mt-2">
                +{(weightedDeposits * (overPo ? rules.perPoHigh : rules.perPoLow)).toLocaleString()} ₽
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">
                {weightedDeposits} × {overPo ? rules.perPoHigh : rules.perPoLow} ₽
                {referralDeposits > 0 && (
                  <span className="ml-1 text-amber-600">(в т.ч. {referralDeposits} реф. ×2)</span>
                )}
                <span className={`ml-2 text-[8px] font-bold px-1.5 py-0.5 rounded border ${overPo ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-neutral-400 bg-white border-neutral-200'}`}>
                  ПО {deposits}/{rules.poThreshold ?? 140}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[8.5px] uppercase font-bold tracking-widest text-neutral-400 leading-none flex items-center gap-1">
                <Clock className="w-3 h-3" /> Часы работы
              </p>
              <p className="text-xl font-display font-bold text-neutral-950 mt-2">
                +{((workedSecs / 3600) * rules.hourlyRate).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">{workedSecs > 0 ? fmtHours(workedSecs) : '—'} × {rules.hourlyRate} ₽/ч</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[8.5px] uppercase font-bold tracking-widest text-neutral-400 leading-none sm:text-right">Итого</p>
              <p className="text-3xl font-display font-black text-neutral-950 mt-2">{Math.round(salary).toLocaleString()} ₽</p>
            </div>
          </div>
        </div>
      )}

      {/* Admin: managers board */}
      {currentUser.role === 'admin' && (
        <div className="p-6 spatial-glass rounded-2xl shadow-sm space-y-5">
          <div className="pb-4 border-b border-neutral-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neutral-950 animate-pulse" />
              Результаты работы и зарплаты — {MONTHS_RU[selectedMonth - 1]} {selectedYear}
            </h3>
            <button onClick={() => onNavigate('salary')}
              className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-widest text-neutral-950 hover:text-white hover:bg-neutral-950 bg-neutral-100/30 border border-neutral-200/50 px-3.5 py-2 rounded-xl cursor-pointer transition-colors duration-200">
              Подробнее <CornerDownRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 pt-1">
            {allUsers.filter(s => s.role === 'manager').map(manager => {
              const ml      = filterByMonth(leads.filter(l => l.managerName === manager.name), selectedYear, selectedMonth);
              const bookings = ml.length;
              const showUpsM = ml.filter(l => l.status === 'showed_up').length;
              const regDeps  = ml.filter(l => (l.yookassaPaid || l.status === 'showed_up') && !l.isReferral).length;
              const refDeps  = ml.filter(l => (l.yookassaPaid || l.status === 'showed_up') && l.isReferral).length;
              const deps     = regDeps + refDeps;
              const wDeps    = regDeps + refDeps * 2;
              const mHours   = allHours[manager.name] ?? 0;
              const sal      = calcSalary(showUpsM, deps, wDeps, mHours, rules);
              const over     = deps > (rules.poThreshold ?? 140);

              return (
                <div key={manager.name} className="p-4 bg-white/40 border border-white/60 hover:bg-white/60 rounded-xl hover:shadow-sm transition-colors duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-neutral-950 flex items-center justify-center font-display font-medium text-sm text-white shadow-sm shrink-0">
                      {manager.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-neutral-950 text-xs truncate">{manager.name}</span>
                        <span className="text-[8px] font-bold tracking-widest px-1.5 py-0.5 bg-white border border-neutral-200/60 rounded text-neutral-500 uppercase leading-none">
                          {manager.department || 'Отдел продаж'}
                        </span>
                        {over && (
                          <span className="text-[8px] font-bold tracking-widest px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 rounded text-indigo-600 uppercase leading-none">
                            ПО &gt; {rules.poThreshold ?? 140} ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-2 font-medium">
                        Записей: <strong className="text-neutral-950">{bookings}</strong>
                        {' · '}Визиты: <strong className="text-emerald-700">{showUpsM}</strong>
                        {' · '}ПО: <strong className="text-amber-700">{deps}</strong>
                        {refDeps > 0 && <span className="text-amber-500"> (+{refDeps} реф.)</span>}
                        {' · '}<Clock className="w-2.5 h-2.5 inline text-neutral-400" /> {mHours > 0 ? fmtHours(mHours) : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                    <div className="text-right">
                      <span className="text-[8.5px] uppercase font-bold text-neutral-400 tracking-widest block leading-none">Начислено</span>
                      <span className="font-black text-neutral-950 text-[13px] block mt-1.5">{Math.round(sal).toLocaleString()} ₽</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
