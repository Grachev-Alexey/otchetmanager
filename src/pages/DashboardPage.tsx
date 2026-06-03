import React from 'react';
import { Calendar, CheckCircle2, Award, Activity, Sliders, CornerDownRight } from 'lucide-react';
import type { LeadReport, CommissionRules, StaffMember } from '../types';

type ActiveMenu = 'dashboard' | 'leads' | 'salary' | 'staff_directory' | 'user_management';

interface Props {
  leads: LeadReport[];
  rules: CommissionRules;
  allUsers: StaffMember[];
  currentUser: StaffMember;
  onNavigate: (menu: ActiveMenu) => void;
}

export default function DashboardPage({ leads, rules, allUsers, currentUser, onNavigate }: Props) {
  const myLeads = currentUser.role === 'admin'
    ? leads
    : leads.filter(l => l.managerName === currentUser.name);

  const totalCount   = myLeads.length;
  const showUps      = myLeads.filter(l => l.status === 'showed_up').length;
  const deposits     = myLeads.filter(l => l.depositRequired && l.depositPaid).length;
  const depositSum   = myLeads.reduce((s, l) => s + (l.depositPaid ? l.depositAmount : 0), 0);
  const noShows      = myLeads.filter(l => l.status === 'no_show').length;

  const arrivalRate  = totalCount > 0 ? (showUps / totalCount) * 100 : 0;
  const noShowRate   = totalCount > 0 ? Math.round((noShows / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-all duration-300">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 leading-none">Записи зарегистрировано</span>
              <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <p className="text-3xl font-display font-bold text-neutral-950 tracking-tight leading-none">{totalCount}</p>
              <span className="text-[10.5px] text-neutral-400 font-bold uppercase tracking-wider">сделок</span>
            </div>
          </div>
          <div className="mt-5 border-t border-neutral-100/40 pt-3 flex items-center justify-between text-[10.5px] text-neutral-500 font-medium">
            <span>Ведомость AmoCRM</span>
            <span className="font-bold text-neutral-950 flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
              синхронизировано <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          </div>
        </div>

        <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-all duration-300">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 leading-none">Визиты состоялось</span>
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
              <span className="font-extrabold text-neutral-950 bg-white/70 px-1.5 py-0.5 rounded-md border border-neutral-100/40 font-mono shadow-sm">
                {Math.round(arrivalRate)}%
              </span>
            </div>
            <div className="w-full bg-neutral-200/50 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-neutral-950 rounded-full transition-all duration-500" style={{ width: `${arrivalRate}%` }} />
            </div>
          </div>
        </div>

        <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-all duration-300">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 leading-none">Предоплаты клиентов</span>
              <Award className="w-4 h-4 text-amber-500 animate-bounce" />
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <p className="text-2xl font-display font-bold text-neutral-950 tracking-tight leading-none">{deposits} шт.</p>
              <span className="text-[8px] text-neutral-600 bg-white/70 border border-neutral-200 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest leading-none shadow-sm">
                подтверждено
              </span>
            </div>
          </div>
          <div className="mt-5 border-t border-neutral-100/40 pt-3 flex items-center justify-between text-[10.5px] text-neutral-500 font-medium">
            <span>На общую сумму:</span>
            <span className="font-bold text-neutral-950 text-xs">{depositSum.toLocaleString()} ₽</span>
          </div>
        </div>

        <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-all duration-300">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400 leading-none">Неявки на встречу</span>
              <Activity className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <p className="text-3xl font-display font-bold text-neutral-950 tracking-tight leading-none">{noShows}</p>
              <span className="text-[10.5px] text-neutral-400 font-bold uppercase tracking-wider">пропусков</span>
            </div>
          </div>
          <div className="mt-5 border-t border-neutral-100/40 pt-3 flex items-center justify-between text-[10.5px] text-neutral-500 font-medium">
            <span>Отношение пропусков</span>
            <span className="font-bold text-red-600 bg-red-50/50 border border-red-100/50 px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider">
              {noShowRate}% потерь
            </span>
          </div>
        </div>
      </div>

      {/* KPI Board */}
      <div className="p-6 spatial-glass rounded-2xl shadow-sm space-y-5">
        <div className="pb-4 border-b border-neutral-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-neutral-950 animate-pulse" />
              Результаты работы и начисления ведомости
            </h3>
            <p className="text-[10.5px] text-neutral-400 mt-1.5 font-medium leading-relaxed">
              Оклады лид-менеджеров с динамическими бонусами за выполнение целевых планов
            </p>
          </div>
          <button
            onClick={() => onNavigate('salary')}
            className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-widest text-neutral-950 hover:text-white hover:bg-neutral-950 bg-neutral-100/30 border border-neutral-200/50 px-3.5 py-2 rounded-xl cursor-pointer transition-all duration-300"
          >
            Все тарифы KPI
            <CornerDownRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-4 pt-1">
          {allUsers.filter(s => s.role === 'manager').map(manager => {
            const ml = leads.filter(l => l.managerName === manager.name);
            const bookings  = ml.length;
            const deps      = ml.filter(l => l.depositRequired && l.depositPaid).length;
            const showUpsM  = ml.filter(l => l.status === 'showed_up').length;
            const commission = (bookings * rules.perBooking) + (deps * rules.perDepositCollected) + (showUpsM * rules.perShowUp);
            const kpiMet    = bookings >= rules.targetBookings;
            const salary    = rules.baseSalary + commission + (kpiMet ? rules.bonusAmount : 0);

            return (
              <div key={manager.name} className="p-4 bg-white/40 border border-white/60 hover:bg-white/60 rounded-xl hover:shadow-sm transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${manager.avatarColor || 'from-indigo-500 to-indigo-700'} flex items-center justify-center font-display font-medium text-sm text-white shadow-sm shrink-0`}>
                    {manager.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-950 text-xs truncate">{manager.name}</span>
                      <span className="text-[8px] font-bold tracking-widest px-1.5 py-0.5 bg-white border border-neutral-200/60 rounded text-neutral-500 uppercase leading-none">
                        {manager.department || 'Отдел продаж'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-2 font-medium">
                      Записей: <strong className="text-neutral-950">{bookings}</strong> / {rules.targetBookings} &bull; Визитов: <strong className="text-emerald-700">{showUpsM}</strong> &bull; Предоплат: <strong className="text-amber-700">{deps}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                  <div className="text-right">
                    <span className="text-[8.5px] uppercase font-bold text-neutral-400 tracking-widest block leading-none">Оклад с премией</span>
                    <span className="font-black text-neutral-950 text-[13px] block mt-1.5">{salary.toLocaleString()} ₽</span>
                  </div>
                  <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${kpiMet ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-neutral-100 text-neutral-400 border border-neutral-200/60'}`}>
                    {kpiMet ? 'KPI ВЫПОЛНЕН' : 'В ПРОЦЕССЕ'}
                  </div>
                </div>
              </div>
            );
          })}
          {allUsers.filter(s => s.role === 'manager').length === 0 && (
            <p className="text-xs text-neutral-500 text-center py-5 bg-white/40 rounded-xl border border-dashed border-neutral-200">
              Менеджеры отсутствуют. Зарегистрируйте их во вкладке «Права доступа».
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
