import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LeadForm from '../components/LeadForm';
import LeadList from '../components/LeadList';
import type { LeadReport, StaffMember } from '../types';

interface Props {
  leads: LeadReport[];
  currentUser: StaffMember;
  allUsers: StaffMember[];
  isFormOpen: boolean;
  editingLead: LeadReport | null;
  onSaveLead: (lead: LeadReport) => Promise<boolean>;
  onDeleteLead: (id: string) => Promise<void>;
  onEditLead: (lead: LeadReport) => void;
  onCloseForm: () => void;
}

export default function LeadsPage({ leads, currentUser, allUsers, isFormOpen, editingLead, onSaveLead, onDeleteLead, onEditLead, onCloseForm }: Props) {
  const authorizedCount = currentUser.role === 'admin'
    ? leads.length
    : leads.filter(l => l.managerName === currentUser.name).length;

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <LeadForm
              initialLead={editingLead}
              currentUserRole={currentUser.role}
              currentManagerName={currentUser.name}
              staffList={allUsers}
              onSave={onSaveLead}
              onCancel={onCloseForm}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="spatial-glass px-4.5 py-4 rounded-xl flex items-center justify-between text-xs text-neutral-700 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neutral-950 shrink-0" />
          <span className="font-bold text-[10.5px] uppercase tracking-wider text-neutral-950">
            {currentUser.role === 'admin'
              ? 'Вы просматриваете ПОЛНЫЙ реестр записей отдела'
              : `Персональный личный лид-кабинет: ${currentUser.name}`}
          </span>
        </div>
        <span className="text-[9px] text-neutral-950 font-extrabold uppercase bg-white/80 px-2.5 py-1 rounded border border-neutral-200/60 shadow-sm">
          Всего в реестре: {authorizedCount} сделок
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
