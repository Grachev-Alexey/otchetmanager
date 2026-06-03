import React from 'react';

type ActiveMenu = 'dashboard' | 'leads' | 'salary' | 'staff_directory' | 'user_management';

const TITLES: Record<ActiveMenu, { crumb: string; heading: string }> = {
  dashboard:        { crumb: 'ГЛАВНАЯ',          heading: 'Обзор и результаты' },
  leads:            { crumb: 'ЗАПИСИ',            heading: 'База записей, визитов и предоплат' },
  salary:           { crumb: 'МОЯ ЗАРПЛАТА',      heading: 'Расчёт зарплаты и бонусов' },
  staff_directory:  { crumb: 'КОМАНДА',           heading: 'Наша команда' },
  user_management:  { crumb: 'НАСТРОЙКИ',         heading: 'Управление пользователями' },
};

interface HeaderProps {
  activeMenu: ActiveMenu;
}

export default function Header({ activeMenu }: HeaderProps) {
  const { crumb, heading } = TITLES[activeMenu] || TITLES.dashboard;

  return (
    <header className="bg-white border-b border-neutral-100 px-6 py-5 shrink-0 shadow-sm">
      <div className="flex items-center gap-2 text-[8.5px] text-neutral-400 font-bold uppercase tracking-widest">
        <span>Виви Маркетинг</span>
        <span>/</span>
        <span className="text-neutral-600">{crumb}</span>
      </div>
      <h1 className="text-[15px] font-display font-semibold text-neutral-950 mt-2 leading-none">
        {heading}
      </h1>
    </header>
  );
}
