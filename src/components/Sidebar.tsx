import React from 'react';
import { LayoutDashboard, Users, Sliders, FileText, Settings, Sparkles, Key, LogOut } from 'lucide-react';
import type { StaffMember } from '../types';

type ActiveMenu = 'dashboard' | 'leads' | 'salary' | 'staff_directory' | 'user_management';

interface SidebarProps {
  currentUser: StaffMember;
  activeMenu: ActiveMenu;
  onNavigate: (menu: ActiveMenu) => void;
  totalLeadsCount: number;
  totalUsersCount: number;
  onLogout: () => void;
}

export default function Sidebar({ currentUser, activeMenu, onNavigate, totalLeadsCount, totalUsersCount, onLogout }: SidebarProps) {
  const navItems = [
    { id: 'dashboard' as const, label: 'Сводка KPI', icon: LayoutDashboard },
    { id: 'leads' as const, label: 'Записи', icon: Users, badge: totalLeadsCount },
    { id: 'salary' as const, label: 'Расчёт KPI', icon: Sliders },
    { id: 'staff_directory' as const, label: 'Сотрудники', icon: FileText, badge: totalUsersCount },
    ...(currentUser.role === 'admin' ? [{ id: 'user_management' as const, label: 'Права доступа', icon: Settings }] : []),
  ];

  return (
    <aside className="w-full lg:w-72 bg-white/75 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-indigo-100/40 shrink-0 flex flex-col justify-between z-40 shadow-sm lg:sticky lg:top-0 lg:h-screen">
      <div>
        <div className="p-6 border-b border-neutral-100/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/50 border border-neutral-200/50 shrink-0 shadow-sm">
              <Sparkles className="w-4 h-4 text-neutral-800 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-display font-bold text-neutral-950 uppercase tracking-widest leading-none">Виви Маркетинг</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-ping" />
              </div>
              <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest block mt-2 leading-none">KPI-менеджмент отделов</span>
            </div>
          </div>

          <div className="mt-5 p-4 rounded-xl bg-white/40 backdrop-blur-xs border border-white/60 shadow-sm">
            <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest leading-none">АКТИВНАЯ СЕССИЯ:</p>
            <div className="flex items-center gap-3 mt-3">
              <div className="w-8 h-8 rounded-xl bg-neutral-950 flex items-center justify-center font-display font-semibold text-xs text-white shadow-sm">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-semibold text-neutral-950 truncate leading-none">{currentUser.name}</h4>
                <p className="text-[9px] text-neutral-500 mt-1.5 flex items-center gap-1.5 leading-none font-medium">
                  <Key className="w-3 h-3 text-neutral-400 shrink-0" />
                  <span>{currentUser.role === 'admin' ? 'Администратор' : 'Личный кабинет'}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="p-5 space-y-1">
          <span className="block px-2.5 mb-3 text-[8.5px] font-bold uppercase tracking-widest text-neutral-400 leading-none">
            РАЗДЕЛЫ СИСТЕМЫ
          </span>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 relative group cursor-pointer active:scale-95 ${
                  isActive
                    ? 'text-indigo-600 bg-indigo-50/55 border border-indigo-100/50 shadow-sm pl-4.5 font-extrabold'
                    : 'text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50/20 pl-3.5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors duration-150 ${isActive ? 'text-indigo-600' : 'text-neutral-400 group-hover:text-indigo-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="bg-indigo-600 text-white text-[8px] font-bold px-2.5 py-1 rounded-lg leading-none shadow-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-5 border-t border-neutral-100/40">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/40 hover:bg-neutral-950 hover:text-white text-neutral-600 border border-neutral-200/60 text-[10.5px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Выйти из аккаунта</span>
        </button>
      </div>
    </aside>
  );
}
