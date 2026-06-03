import React from 'react';
import LeadList from '../components/LeadList';
import type { LeadReport, StaffMember } from '../types';

interface Props {
  leads: LeadReport[];
  currentUser: StaffMember;
  onEditLead: (lead: LeadReport) => void;
  onDeleteLead: (id: string) => Promise<void>;
}

export default function LeadsPage({ leads, currentUser, onEditLead, onDeleteLead }: Props) {
  const authorizedCount = currentUser.role === 'admin'
    ? leads.length
    : leads.filter(l => l.managerName === currentUser.name).length;

  return (
    <div className="space-y-6">
      <div className="spatial-glass px-4.5 py-4 rounded-xl flex items-center justify-between text-xs text-neutral-700 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neutral-950 shrink-0" />
          <span className="font-bold text-[10.5px] uppercase tracking-wider text-neutral-950">
            {currentUser.role === 'admin' ? 'Все записи отдела' : currentUser.name}
          </span>
        </div>
        <span className="text-[9px] text-neutral-950 font-extrabold uppercase bg-white/80 px-2.5 py-1 rounded border border-neutral-200/60 shadow-sm">
          Записей: {authorizedCount}
        </span>
      </div>

      <LeadList
        leads={leads}
        onEdit={onEditLead}
        onDelete={onDeleteLead}
        currentUserRole={currentUser.role}
        currentManagerName={currentUser.name}
      />
    </div>
  );
}
