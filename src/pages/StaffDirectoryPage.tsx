import React from 'react';
import type { StaffMember, LeadReport } from '../types';

interface Props {
  allUsers: StaffMember[];
  leads: LeadReport[];
}

export default function StaffDirectoryPage({ allUsers, leads }: Props) {
  return (
    <div className="spatial-glass rounded-2xl p-6 space-y-6 shadow-sm">
      <div className="pb-4 border-b border-neutral-100/50">
        <h3 className="font-display font-semibold text-neutral-950 text-sm uppercase tracking-widest leading-none">
          Сотрудники «Виви Маркетинг»
        </h3>
        <p className="text-[10.5px] text-neutral-400 mt-2 font-bold uppercase tracking-wider leading-none">
          Официальный реестр сотрудников с их текущим статусом активности в портале.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {allUsers.map(staff => {
          const personalLeads = leads.filter(l => l.managerName === staff.name);
          const showUps  = personalLeads.filter(l => l.status === 'showed_up').length;
          const deposits = personalLeads.filter(l => l.depositRequired && l.depositPaid).length;

          return (
            <div
              key={staff.name}
              className="p-5 rounded-xl bg-white/40 border border-white/60 hover:bg-white/60 hover:-translate-y-0.5 transition duration-300 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${staff.avatarColor || 'from-indigo-500 to-indigo-700'} flex items-center justify-center font-display font-semibold text-white text-sm shadow-sm`}>
                    {staff.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-neutral-950 text-sm flex items-center gap-2">
                      {staff.name}
                      <span className={`text-[8px] font-extrabold tracking-widest px-1.5 py-0.5 rounded uppercase leading-none ${staff.role === 'admin' ? 'bg-neutral-950 text-white' : 'bg-white/80 text-neutral-500 border border-neutral-200/50 shadow-sm'}`}>
                        {staff.role === 'admin' ? 'Админ' : 'Менеджер'}
                      </span>
                    </h4>
                    <p className="text-[9px] text-neutral-400 font-extrabold uppercase mt-1.5 leading-none tracking-widest">
                      {staff.department || 'Отдел продаж'}
                    </p>
                  </div>
                </div>
                <span className="text-[9.5px] text-neutral-400 font-bold uppercase tracking-wider shrink-0">
                  {staff.lastActive || 'Не в сети'}
                </span>
              </div>

              <p className="text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-100/40 pt-3.5 font-medium">
                {staff.bio || 'Лид-менеджер команды продаж «Виви Маркетинг».'}
              </p>

              {staff.role === 'manager' && (
                <div className="grid grid-cols-3 gap-3 text-center pt-2 text-[10.5px]">
                  {[
                    { label: 'Записи',     value: personalLeads.length, color: 'text-neutral-950' },
                    { label: 'Визиты',     value: showUps,               color: 'text-emerald-700' },
                    { label: 'Предоплаты', value: deposits,              color: 'text-amber-700' },
                  ].map(s => (
                    <div key={s.label} className="p-2.5 bg-white/50 rounded-lg border border-neutral-200/50 shadow-sm">
                      <span className="text-[8px] text-neutral-400 block font-bold uppercase leading-none tracking-widest">{s.label}</span>
                      <strong className={`${s.color} text-xs font-bold block mt-1.5 leading-none`}>{s.value}</strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-neutral-100/40 flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${staff.status === 'online' ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest leading-none">
                  {staff.status === 'online' ? 'В сети' : 'Не в сети'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
