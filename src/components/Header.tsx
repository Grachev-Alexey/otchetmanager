import React from 'react';
import { Plus } from 'lucide-react';

type ActiveMenu = 'dashboard' | 'leads' | 'salary' | 'staff_directory' | 'user_management';

const TITLES: Record<ActiveMenu, { crumb: string; heading: string }> = {
  dashboard:        { crumb: 'СВОДНАЯ АНАЛИТИКА KPI',         heading: 'Общая статистика лид-менеджеров' },
  leads:            { crumb: 'БАЗА ЗАПИСЕЙ',                    heading: 'База записей, визитов и предоплат' },
  salary:           { crumb: 'КОМИССИИ И РАСЧЁТ KPI',          heading: 'Комиссионная сетка и расчёт KPI' },
  staff_directory:  { crumb: 'КОЛЛЕКТИВ',                       heading: 'Коллектив лид-менеджеров' },
  user_management:  { crumb: 'ПРАВА ДОСТУПА',                   heading: 'Управление пользователями и правами' },
};

interface HeaderProps {
  activeMenu: ActiveMenu;
  isFormOpen: boolean;
  onToggleForm: () => void;
}

export default function Header({ activeMenu, isFormOpen, onToggleForm }: HeaderProps) {
  const { crumb, heading } = TITLES[activeMenu] || TITLES.dashboard;

  return (
    <header className="bg-white/70 backdrop-blur-md border-b border-neutral-100/30 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-sm">
      <div>
        <div className="flex items-center gap-2 text-[8.5px] text-neutral-400 font-bold uppercase tracking-widest">
          <span>Виви Маркетинг</span>
          <span>/</span>
          <span className="text-neutral-600">{crumb}</span>
        </div>
        <h1 className="text-[15px] font-display font-semibold text-neutral-950 mt-2 leading-none">
          {heading}
        </h1>
      </div>

      <button
        onClick={onToggleForm}
        className="self-start sm:self-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl text-[10.5px] uppercase tracking-widest cursor-pointer shadow-[0_4px_18px_-4px_rgba(79,70,229,0.4)] transition-all duration-300 flex items-center gap-2 active:scale-95 hover:scale-[1.01]"
      >
        <span>{isFormOpen ? 'Скрыть форму' : 'Внести запись'}</span>
        <Plus className="w-3.5 h-3.5" />
      </button>
    </header>
  );
}
