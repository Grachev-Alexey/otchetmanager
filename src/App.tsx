import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Calendar, Award, FileText, CheckCircle2, 
  LayoutDashboard, Settings, LogIn, Sparkles, TrendingUp, HelpCircle, Activity,
  Sliders, User, Key, Plus, LogOut, Trash2, Edit, Save, ArrowRight, CornerDownRight, Check, X, ShieldAlert, BadgeCheck
} from 'lucide-react';

import { LeadReport, CommissionRules, StaffMember } from './types';
import SalarySummary from './components/SalarySummary';
import LeadForm from './components/LeadForm';
import LeadList from './components/LeadList';

export default function App() {
  const [leads, setLeads] = useState<LeadReport[]>([]);
  const [rules, setRules] = useState<CommissionRules>({
    baseSalary: 40000,
    perBooking: 1000,
    perDepositCollected: 1500,
    perShowUp: 2000,
    targetBookings: 15,
    bonusAmount: 10000
  });
  
  // Authenticated state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);

  // Nav: dashboard, leads, salary, staff_directory, user_management (admin-only)
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'leads' | 'salary' | 'staff_directory' | 'user_management'>('dashboard');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadReport | null>(null);

  // Real-time synchronization state
  const [loading, setLoading] = useState(true);

  // Authenticating PIN entry state
  const [pinInput, setPinInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showHelperPins, setShowHelperPins] = useState(true);

  // User Management state
  const [allUsers, setAllUsers] = useState<StaffMember[]>([]);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffMember | null>(null);
  const [newUserFormState, setNewUserFormState] = useState({
    name: '',
    role: 'manager' as 'admin' | 'manager',
    pin: '',
    department: 'Отдел продаж',
    bio: '',
    avatarColor: 'from-blue-500 to-indigo-500'
  });
  const [userManageError, setUserManageError] = useState('');
  const [userManageSuccess, setUserManageSuccess] = useState('');

  // Fetch functions
  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      const data = await response.json();
      setLeads(data);
    } catch (err) {
      console.error('Failed to fetch lead logs:', err);
    }
  };

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/rules');
      const data = await response.json();
      setRules(data);
    } catch (err) {
      console.error('Failed to fetch rules:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setAllUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([fetchLeads(), fetchRules(), fetchUsers()]);
      
      // Auto restore login session from localStorage if present
      const storedUser = localStorage.getItem('vivi_marketing_session');
      if (storedUser) {
        try {
          const userObj = JSON.parse(storedUser);
          setCurrentUser(userObj);
          setIsAuthenticated(true);
        } catch (e) {
          localStorage.removeItem('vivi_marketing_session');
        }
      }
      setLoading(false);
    };
    initialize();
  }, []);

  // AUTOMATED REAL-TIME SYNCHRONIZATION: Refetch all data silently every 5 seconds
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (isAuthenticated) {
        fetchLeads();
        fetchRules();
        fetchUsers();
      }
    }, 5000);
    return () => clearInterval(syncInterval);
  }, [isAuthenticated]);

  // Lead CRUD handlers
  const handleSaveLead = async (leadPayload: LeadReport): Promise<boolean> => {
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadPayload),
      });
      if (response.ok) {
        await fetchLeads();
        setIsFormOpen(false);
        setEditingLead(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save lead:', error);
      return false;
    }
  };

  const handleDeleteLead = async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchLeads();
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleSaveRules = async (updatedRules: CommissionRules): Promise<boolean> => {
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRules),
      });
      if (response.ok) {
        setRules(updatedRules);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to save rules:', err);
      return false;
    }
  };

  const handleEditLeadClick = (lead: LeadReport) => {
    setEditingLead(lead);
    setIsFormOpen(true);
    setActiveMenu('leads');
  };

  // PIN-Code Authentication logic
  const handlePinLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinInput || pinInput.trim() === '') {
      setLoginError('Пожалуйста, введите ваш ПИН-код');
      return;
    }

    setLoginError('');
    setIsVerifying(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setPinInput('');
        localStorage.setItem('vivi_marketing_session', JSON.stringify(data.user));
        await Promise.all([fetchLeads(), fetchRules(), fetchUsers()]);
      } else {
        setLoginError(data.error || 'Неверный ПИН-код доступа');
      }
    } catch (err) {
      setLoginError('Сбой авторизации. Проверьте подключение.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: currentUser.name })
        });
      } catch (e) {
        console.error('Logout sync err:', e);
      }
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('vivi_marketing_session');
    setPinInput('');
    setLoginError('');
    setActiveMenu('dashboard');
  };

  // User Management Admin Actions
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserManageError('');
    setUserManageSuccess('');

    const { name, role, pin, department, bio, avatarColor } = newUserFormState;
    if (!name || !pin) {
      setUserManageError('ФИО сотрудника и ПИН-код обязательны');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          pin,
          department,
          bio,
          avatarColor,
          status: editingUser ? editingUser.status : 'offline',
          lastActive: editingUser ? editingUser.lastActive : 'Не в сети'
        })
      });

      if (response.ok) {
        setUserManageSuccess(editingUser ? 'Сотрудник успешно обновлен' : 'Новый сотрудник зарегистрирован');
        await fetchUsers();
        setTimeout(() => {
          setUserFormOpen(false);
          setEditingUser(null);
          setNewUserFormState({
            name: '',
            role: 'manager',
            pin: '',
            department: 'Отдел продаж',
            bio: '',
            avatarColor: 'from-blue-500 to-indigo-505'
          });
          setUserManageSuccess('');
        }, 1500);
      } else {
        const errData = await response.json();
        setUserManageError(errData.error || 'Ошибка записи пользователя');
      }
    } catch (err) {
      setUserManageError('Ошибка соединения с базой.');
    }
  };

  const handleEditUserClick = (staff: StaffMember) => {
    setEditingUser(staff);
    setNewUserFormState({
      name: staff.name,
      role: staff.role,
      pin: staff.pin,
      department: staff.department,
      bio: staff.bio || '',
      avatarColor: staff.avatarColor || 'from-indigo-500 to-indigo-650'
    });
    setUserFormOpen(true);
  };

  const handleDeleteUser = async (name: string) => {
    if (confirm(`Вы действительно хотите удалить сотрудника ${name}?`)) {
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(name)}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          await fetchUsers();
        }
      } catch (err) {
        console.error('User delete err:', err);
      }
    }
  };

  // Filter lists by logged manager
  const getAuthorizedLeads = () => {
    if (!currentUser) return [];
    return currentUser.role === 'admin' 
      ? leads 
      : leads.filter(l => l.managerName === currentUser.name);
  };

  const authorizedLeads = getAuthorizedLeads();

  // Metrics Dashboard calculations
  const totalLeadsCount = authorizedLeads.length;
  const totalDepositsCount = authorizedLeads.filter(l => l.depositRequired && l.depositPaid).length;
  const totalSumDeposits = authorizedLeads.reduce((acc, lead) => acc + (lead.depositPaid ? lead.depositAmount : 0), 0);
  const totalShowUpsCount = authorizedLeads.filter(l => l.status === 'showed_up').length;
  const totalNoShowsCount = authorizedLeads.filter(l => l.status === 'no_show').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/60 via-slate-50 to-indigo-150/20 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="relative mb-6">
          <div className="w-14 h-14 rounded-full border-2 border-indigo-200/50 border-t-indigo-600 animate-spin" />
          <Award className="w-6 h-6 text-indigo-600 absolute top-4 left-4 animate-pulse" />
        </div>
        <h3 className="font-display font-extrabold text-indigo-950 text-xs tracking-widest uppercase">
          Загрузка «Виви Маркетинг»...
        </h3>
        <p className="text-[10.5px] text-indigo-505 mt-2 font-bold uppercase tracking-wider">Синхронизация с базой...</p>
      </div>
    );
  }

  // ENTRANCE LOGIN PORTAL: AUTHENTICATION BY PIN CODE ONLY
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/60 via-slate-50/90 to-indigo-150/25 flex items-center justify-center p-6 font-sans select-none antialiased">
        <div className="w-full max-w-sm animate-fade-in">
          
          <div className="spatial-glass rounded-3xl p-8 shadow-md space-y-6 relative overflow-hidden border border-indigo-100/50">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 animate-pulse" />
            
            {/* Visual Header */}
            <div className="text-center space-y-2">
              <h2 className="text-xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-700 tracking-tight">«Виви Маркетинг»</h2>
              <p className="text-[8.5px] text-indigo-505 uppercase font-bold tracking-widest leading-none">
                Система KPI и учета записей
              </p>
            </div>
 
            <form onSubmit={handlePinLogin} className="space-y-4">
              {loginError && (
                 <div className="py-2.5 px-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center text-[10.5px] font-bold tracking-wider uppercase leading-relaxed">
                  {loginError}
                </div>
              )}
 
              {/* Secure Input Area */}
              <div className="space-y-2">
                <label className="block text-[8px] uppercase font-extrabold tracking-widest text-neutral-400">
                  Введите ваш рабочий ПИН-код
                </label>
                <input
                  id="pin-login-input"
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  autoFocus
                  className="w-full text-center tracking-[0.5em] font-extrabold text-lg py-3 bg-white/70 border border-neutral-150 rounded-xl text-neutral-950 focus:outline-hidden focus:border-indigo-500 placeholder-neutral-350 transition-all shadow-4xs"
                />
              </div>
 
              <button
                id="do-pin-login-btn"
                type="submit"
                disabled={isVerifying || pinInput.length < 4}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-550 hover:to-violet-550 disabled:from-neutral-200 disabled:to-neutral-300 disabled:text-neutral-400 text-white font-extrabold uppercase tracking-widest text-[9.5px] rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_4px_18px_-4px_rgba(79,70,229,0.4)] hover:scale-[1.01] active:scale-95"
              >
                {isVerifying ? 'Проверка...' : 'Войти в систему'}
              </button>
            </form>

          </div>
        </div>
      </div>
    );



  }

  // LOGGED IN PORTAL INTERFACE
  return (
    <div className="min-h-screen bg-slate-50/10 text-slate-800 flex flex-col lg:flex-row antialiased font-sans">
      
      {/* 2. ASIDE SYSTEM NAVIGATION */}
      <aside className="w-full lg:w-72 bg-white/75 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-indigo-100/40 shrink-0 flex flex-col justify-between z-40 shadow-3xs lg:sticky lg:top-0 lg:h-screen">
        <div>
          {/* Top Brand Block */}
          <div className="p-6 border-b border-neutral-150/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/50 border border-neutral-200/50 text-neutral-900 shrink-0 shadow-4xs">
                <Sparkles className="w-4 h-4 text-neutral-800 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-display font-bold text-neutral-950 uppercase tracking-widest leading-none">Виви Маркетинг</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-3xs shrink-0 animate-ping" />
                </div>
                <span className="text-[9px] text-neutral-450 font-bold uppercase tracking-widest block mt-2 leading-none">KPI-менеджмент отделов</span>
              </div>
            </div>

            {/* Simulated Session card */}
            <div className="mt-5 p-4 rounded-xl bg-white/40 backdrop-blur-xs border border-white/60 relative overflow-hidden shadow-4xs">
              <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest leading-none">АКТИВНАЯ СЕССИЯ:</p>
              <div className="flex items-center gap-3 mt-3">
                <div className="w-8 h-8 rounded-xl bg-neutral-950 flex items-center justify-center font-display font-semibold text-xs text-white shadow-2xs">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-neutral-950 truncate leading-none">
                    {currentUser.name}
                  </h4>
                  <p className="text-[9px] text-neutral-500 mt-1.5 flex items-center gap-1.5 leading-none font-medium">
                    <Key className="w-3 h-3 text-neutral-400 shrink-0" />
                    <span>{currentUser.role === 'admin' ? 'Администратор' : 'Личный кабинет'}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-5 space-y-1">
            <span className="block px-2.5 mb-3 text-[8.5px] font-bold uppercase tracking-widest text-neutral-400 leading-none">
              РАЗДЕЛЫ СИСТЕМЫ
            </span>
            
            {[
              { id: 'dashboard', label: 'Сводка KPI', icon: LayoutDashboard },
              { id: 'leads', label: 'Записи', icon: Users, badge: totalLeadsCount },
              { id: 'salary', label: 'Расчет KPI', icon: Sliders },
              { id: 'staff_directory', label: 'Сотрудники', icon: FileText, badge: allUsers.length },
              ...(currentUser.role === 'admin' ? [{ id: 'user_management', label: 'Права доступа', icon: Settings }] : [])
            ].map(item => {
              const IconComp = item.icon;
              const isActive = activeMenu === item.id;
              
              return (
                <button
                  id={`spatial-menu-btn-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    setActiveMenu(item.id as any);
                    if (item.id !== 'leads') setIsFormOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 relative group cursor-pointer active:scale-95 ${
                    isActive 
                      ? 'text-indigo-650 bg-indigo-50/55 border border-indigo-100/50 shadow-3xs pl-4.5 font-extrabold' 
                      : 'text-neutral-600 hover:text-indigo-600 hover:bg-indigo-50/20 pl-3.5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp className={`w-4 h-4 transition-colors duration-150 ${
                      isActive ? 'text-indigo-600' : 'text-neutral-450 group-hover:text-indigo-500'
                    }`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="bg-indigo-600 text-white border border-indigo-700 text-[8px] font-bold px-2.5 py-1 rounded-lg leading-none shadow-3xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* LOGOUT BUTTON IN THE SIDEBAR ONLY */}
        <div className="p-5 border-t border-neutral-150/40">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/40 hover:bg-neutral-950 hover:text-white text-neutral-600 border border-neutral-200/60 text-[10.5px] font-bold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer shadow-3xs active:scale-95"
          >
            <LogOut className="w-3.5 h-3.5 text-neutral-450 group-hover:text-white" />
            <span>Выйти из аккаунта</span>
          </button>
        </div>
      </aside>

      {/* 3. MAIN WORKPLACE PLATFORM */}
      <main className="flex-1 flex flex-col min-w-0 z-10 relative">
        
        {/* Transparent header banner */}
        <header className="bg-white/70 backdrop-blur-md border-b border-neutral-150/30 px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 relative shadow-4xs">
          <div>
            <div className="flex items-center gap-2 text-[8.5px] text-neutral-400 font-bold uppercase tracking-widest">
              <span>Виви Маркетинг</span>
              <span>/</span>
              <span className="text-neutral-600">
                {activeMenu === 'dashboard' && 'СВОДНАЯ АНАЛИТИКА KPI'}
                {activeMenu === 'leads' && 'БАЗА ЗАПИСЕЙ'}
                {activeMenu === 'salary' && 'КОМИССИИ И РАСЧЕТ KPI'}
                {activeMenu === 'staff_directory' && 'КОЛЛЕКТИВ'}
                {activeMenu === 'user_management' && 'ПРАВА ДОСТУПА'}
              </span>
            </div>

            <h1 className="text-[15px] font-display font-semibold text-neutral-950 mt-2 flex items-center gap-2 leading-none">
              {activeMenu === 'dashboard' && 'Общая статистика лид-менеджеров'}
              {activeMenu === 'leads' && 'База записей, визитов и предоплат'}
              {activeMenu === 'salary' && 'Комиссионная сетка и расчет KPI'}
              {activeMenu === 'staff_directory' && 'Коллектив лид-менеджеров'}
              {activeMenu === 'user_management' && 'Управление пользователями и правами'}
            </h1>
          </div>

          {/* Quick add action button */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              onClick={() => {
                setEditingLead(null);
                setIsFormOpen(!isFormOpen);
                setActiveMenu('leads');
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-550 hover:to-violet-550 text-white font-bold rounded-xl text-[10.5px] uppercase tracking-widest cursor-pointer shadow-[0_4px_18px_-4px_rgba(79,70,229,0.4)] transition-all duration-300 flex items-center gap-2 active:scale-95 hover:scale-[1.01]"
            >
              <span>{isFormOpen ? 'Скрыть форму' : 'Внести запись'}</span>
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Dynamic Workplace View Area */}
        <div className="flex-1 p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
          
          <AnimatePresence mode="wait">
            
            {/* VIEW 1: DASHBOARD SWEEP PANEL */}
            {activeMenu === 'dashboard' && (
              <motion.div
                key="dashboard-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Visual stats grid cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  
                  {/* Card 1: Total Booked Contacts (Записи) */}
                  <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-all duration-300">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-450 leading-none">Записи зарегистрировано</span>
                        <Calendar className="w-4 h-4 text-neutral-400 shrink-0" />
                      </div>
                      <div className="mt-5 flex items-baseline gap-2">
                        <p className="text-3xl font-display font-bold text-neutral-950 tracking-tight leading-none">
                          {totalLeadsCount}
                        </p>
                        <span className="text-[10.5px] text-neutral-450 font-bold uppercase tracking-wider">сделок</span>
                      </div>
                    </div>
                    <div className="mt-5 border-t border-neutral-150/40 pt-3 flex items-center justify-between text-[10.5px] text-neutral-500 font-medium">
                      <span>Ведомость AmoCRM</span>
                      <span className="font-bold text-neutral-950 flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
                        синхронизировано <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Confirmed Arrivals Rate (Визиты) */}
                  <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-all duration-300">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-450 leading-none">Визиты состоялось</span>
                        <CheckCircle2 className="w-4 h-4 text-neutral-450 animate-pulse" />
                      </div>
                      <div className="mt-5 flex items-baseline gap-2">
                        <p className="text-3xl font-display font-bold text-neutral-950 tracking-tight leading-none">
                          {totalShowUpsCount}
                        </p>
                        <span className="text-[10.5px] text-neutral-450 font-bold uppercase tracking-wider">клиентов</span>
                      </div>
                    </div>
                    
                    {/* Live Progress Bar */}
                    <div className="mt-5">
                      <div className="flex justify-between text-[9.5px] text-neutral-450 mb-1.5 font-bold uppercase tracking-wide">
                        <span>Процент прихода</span>
                        <span className="font-extrabold text-neutral-955 bg-white/70 px-1.5 py-0.5 rounded-md border border-neutral-150/40 font-mono shadow-4xs">
                          {totalLeadsCount > 0 ? Math.round((totalShowUpsCount / totalLeadsCount) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200/50 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-neutral-950 rounded-full"
                          style={{ width: `${totalLeadsCount > 0 ? (totalShowUpsCount / totalLeadsCount) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Prepayments / Deposits (Предоплаты) */}
                  <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-all duration-300">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-450 leading-none">Предоплаты клиентов</span>
                        <Award className="w-4 h-4 text-amber-500 animate-bounce" />
                      </div>
                      <div className="mt-5 flex items-baseline gap-2">
                        <p className="text-2xl font-display font-bold text-neutral-950 tracking-tight leading-none">
                          {totalDepositsCount} шт.
                        </p>
                        <span className="text-[8px] text-neutral-600 bg-white/70 border border-neutral-200 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest leading-none shadow-4xs">
                          подтверждено
                        </span>
                      </div>
                    </div>
                    <div className="mt-5 border-t border-neutral-150/40 pt-3 flex items-center justify-between text-[10.5px] text-neutral-500 font-medium">
                      <span>На общую сумму:</span>
                      <span className="font-bold text-neutral-950 text-xs">
                        {totalSumDeposits.toLocaleString()} ₽
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Missed appointments percentage */}
                  <div className="spatial-glass rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-all duration-300">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-450 leading-none">Неявки на встречу</span>
                        <Activity className="w-4 h-4 text-neutral-450" />
                      </div>
                      <div className="mt-5 flex items-baseline gap-2">
                        <p className="text-3xl font-display font-bold text-neutral-955 tracking-tight leading-none">
                          {totalNoShowsCount}
                        </p>
                        <span className="text-[10.5px] text-neutral-450 font-bold uppercase tracking-wider">пропусков</span>
                      </div>
                    </div>
                    <div className="mt-5 border-t border-neutral-150/40 pt-3 flex items-center justify-between text-[10.5px] text-neutral-500 font-medium">
                      <span>Отношение пропусков</span>
                      <span className="font-bold text-red-650 bg-red-50/50 border border-red-100/50 px-1.5 py-0.5 rounded-md text-[9px] uppercase tracking-wider">
                        {totalLeadsCount > 0 ? Math.round((totalNoShowsCount / totalLeadsCount) * 100) : 0}% потерь
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dashboard secondary grid flow */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* KPI performance board for staff */}
                  <div className="lg:col-span-3 p-6 spatial-glass rounded-2xl shadow-sm space-y-5">
                    <div className="pb-4 border-b border-neutral-150/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-neutral-950 animate-pulse" />
                          Результаты работы и начисления ведомости
                        </h3>
                        <p className="text-[10.5px] text-neutral-400 mt-1.5 font-medium leading-relaxed">Оклады лид-менеджеров с динамическими бонусами за выполнение целевых планов записей</p>
                      </div>
                      
                      <button 
                        onClick={() => setActiveMenu('salary')}
                        className="text-[9.5px] font-bold uppercase tracking-widest text-neutral-950 hover:text-white hover:bg-neutral-950 bg-neutral-150/30 border border-neutral-200/50 px-3.5 py-2 rounded-xl cursor-pointer transition-all duration-300"
                      >
                        Все тарифы KPI 
                        <CornerDownRight className="w-3.5 h-3.5 translate-y-[1px]" />
                      </button>
                    </div>

                    <div className="space-y-4 pt-1">
                      {allUsers.filter(s => s.role === 'manager').map(manager => {
                        const managerLeads = leads.filter(l => l.managerName === manager.name);
                        const bookings = managerLeads.length;
                        const deposits = managerLeads.filter(l => l.depositRequired && l.depositPaid).length;
                        const showUps = managerLeads.filter(l => l.status === 'showed_up').length;

                        // Calculate salary model
                        const basicCommission = (bookings * rules.perBooking) + (deposits * rules.perDepositCollected) + (showUps * rules.perShowUp);
                        const isKpiMet = bookings >= rules.targetBookings;
                        const finalSalary = rules.baseSalary + basicCommission + (isKpiMet ? rules.bonusAmount : 0);

                        return (
                          <div 
                            key={manager.name}
                            className="p-4 bg-white/40 border border-white/60 hover:bg-white/60 rounded-xl hover:shadow-3xs transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${manager.avatarColor || 'from-indigo-500 to-indigo-650'} flex items-center justify-center font-display font-medium text-sm text-white shadow-3xs relative shrink-0`}>
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
                                  Записей: <strong className="text-neutral-950 font-bold">{bookings}</strong> / {rules.targetBookings} • Визитов: <strong className="text-emerald-700 font-bold">{showUps}</strong> • Предоплат: <strong className="text-amber-700 font-bold">{deposits}</strong>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                              <div className="text-right">
                                <span className="text-[8.5px] uppercase font-bold text-neutral-400 tracking-widest block leading-none">Оклад с премией</span>
                                <span className="font-black text-neutral-950 text-[13px] block mt-1.5">{finalSalary.toLocaleString()} ₽</span>
                              </div>
                              
                              <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                                isKpiMet 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-250' 
                                  : 'bg-neutral-100 text-neutral-450 border border-neutral-200/60'
                              }`}>
                                {isKpiMet ? 'KPI ВЫПОЛНЕН' : 'В ПРОЦЕССЕ'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {allUsers.filter(s => s.role === 'manager').length === 0 && (
                        <p className="text-xs text-neutral-500 text-center py-5 bg-white/40 rounded-xl border border-dashed border-neutral-250">
                          Менеджеры в базе данных отсутствуют. Зарегистрируйте их во вкладке «Управление».
                        </p>
                      )}
                    </div>
                  </div>



                </div>
              </motion.div>
            )}

            {/* VIEW 2: LEADS LIST (РЕЕСТР ЗАПИСЕЙ КЛИЕНТОВ) */}
            {activeMenu === 'leads' && (
              <motion.div
                key="leads-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Form to submit/modify records */}
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
                        onSave={handleSaveLead}
                        onCancel={() => {
                          setIsFormOpen(false);
                          setEditingLead(null);
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Scope strip status */}
                <div className="spatial-glass px-4.5 py-4 rounded-xl flex items-center justify-between text-xs text-neutral-700 shadow-4xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neutral-950 shrink-0" />
                    <span className="font-bold text-[10.5px] uppercase tracking-wider text-neutral-950">
                      {currentUser.role === 'admin' 
                        ? 'Вы просматриваете ПОЛНЫЙ реестр записей отдела' 
                        : `Персональный личный лид-кабинет: ${currentUser.name}`}
                    </span>
                  </div>
                  <span className="text-[9px] text-neutral-950 font-extrabold uppercase bg-white/80 px-2.5 py-1 rounded border border-neutral-250/60 shadow-4xs">
                    Всего в реестре: {authorizedLeads.length} сделок
                  </span>
                </div>

                {/* Real interactive list components */}
                <LeadList 
                  leads={leads}
                  onEdit={handleEditLeadClick}
                  onDelete={handleDeleteLead}
                  currentUserRole={currentUser.role}
                  currentManagerName={currentUser.name}
                />
              </motion.div>
            )}

            {/* VIEW 3: SYSTEM PAYROLL TAFF / SALARY CALCULATION SHEET */}
            {activeMenu === 'salary' && (
              <motion.div
                key="salary-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
              >
                <SalarySummary 
                  leads={leads}
                  rules={rules}
                  onSaveRules={handleSaveRules}
                  currentUserRole={currentUser.role}
                  currentManagerName={currentUser.name}
                />
              </motion.div>
            )}

            {/* VIEW 4: TEAM MEMBERS / STAFF DIRECTORY (РЕЕСТР СОТРУДНИКОВ) */}
            {activeMenu === 'staff_directory' && (
              <motion.div
                key="staff-directory-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="spatial-glass rounded-2xl p-6 space-y-6 shadow-sm">
                  <div className="pb-4 border-b border-neutral-150/50">
                    <h3 className="font-display font-semibold text-neutral-950 text-sm uppercase tracking-widest leading-none">
                      Сотрудники «Виви Маркетинг»
                    </h3>
                    <p className="text-[10.5px] text-neutral-450 mt-2 font-bold uppercase tracking-wider leading-none">Официальный реестр сотрудников с их текущим статусом активности в портале.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    {allUsers.map(staff => {
                      const personalLeads = leads.filter(l => l.managerName === staff.name);
                      const showUps = personalLeads.filter(l => l.status === 'showed_up').length;
                      const deposits = personalLeads.filter(l => l.depositRequired && l.depositPaid).length;

                      return (
                        <div 
                          key={staff.name} 
                          className="p-5 rounded-xl bg-white/40 border border-white/60 hover:bg-white/60 hover:-translate-y-0.5 transition duration-300 shadow-3xs space-y-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${staff.avatarColor || 'from-indigo-500 to-indigo-650'} flex items-center justify-center font-display font-semibold text-white text-sm relative shadow-2xs`}>
                                {staff.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-neutral-950 text-sm flex items-center gap-2">
                                  {staff.name}
                                  <span className={`text-[8px] font-extrabold tracking-widest px-1.5 py-0.5 rounded uppercase leading-none ${
                                    staff.role === 'admin' ? 'bg-neutral-950 text-white border border-neutral-950' : 'bg-white/80 text-neutral-500 border border-neutral-200/50 shadow-4xs'
                                  }`}>
                                    {staff.role === 'admin' ? 'Админ' : 'Менеджер'}
                                  </span>
                                </h4>
                                <p className="text-[9px] text-neutral-450 font-extrabold uppercase mt-1.5 leading-none tracking-widest">
                                  {staff.department || 'Отдел продаж'}
                                </p>
                              </div>
                            </div>

                            <span className="text-[9.5px] text-neutral-450 font-bold uppercase tracking-wider">{staff.lastActive || 'Не в сети'}</span>
                          </div>

                          <p className="text-[11px] text-neutral-500 leading-relaxed border-t border-neutral-150/40 pt-3.5 font-medium">
                            {staff.bio || 'Лид-менеджер команды продаж «Виви Маркетинг».'}
                          </p>

                          {staff.role === 'manager' && (
                            <div className="grid grid-cols-3 gap-3 text-center pt-2 text-[10.5px]">
                              <div className="p-2.5 bg-white/50 rounded-lg border border-neutral-200/50 shadow-4xs">
                                <span className="text-[8px] text-neutral-450 block font-bold uppercase leading-none tracking-widest">Записи</span>
                                <strong className="text-neutral-950 text-xs font-bold block mt-1.5 leading-none">{personalLeads.length}</strong>
                              </div>
                              <div className="p-2.5 bg-white/50 rounded-lg border border-neutral-200/50 shadow-4xs">
                                <span className="text-[8px] text-neutral-450 block font-bold uppercase leading-none tracking-widest">Визиты</span>
                                <strong className="text-emerald-700 text-xs font-bold block mt-1.5 leading-none">{showUps}</strong>
                              </div>
                              <div className="p-2.5 bg-white/50 rounded-lg border border-neutral-200/50 shadow-4xs">
                                <span className="text-[8px] text-neutral-450 block font-bold uppercase leading-none tracking-widest">Предоплаты</span>
                                <strong className="text-amber-700 text-xs font-bold block mt-1.5 leading-none">{deposits}</strong>
                              </div>
                            </div>
                          )}

                          <div className="pt-3 border-t border-neutral-150/40 flex items-center justify-between">
                            <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest flex items-center gap-1.5 leading-none">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                staff.status === 'online' ? 'bg-emerald-500 shadow-3xs animate-ping' : 'bg-slate-400'
                              }`} />
                              <span>{staff.status === 'online' ? 'В сети' : 'Не в сети'}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 5: USER MANAGEMENT (ADMIN ONLY) */}
            {activeMenu === 'user_management' && currentUser.role === 'admin' && (
              <motion.div
                key="user-management-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Form to create/edit staff */}
                <AnimatePresence>
                  {userFormOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <form onSubmit={handleSaveUser} className="spatial-glass p-6 rounded-2xl space-y-5 shadow-sm text-xs relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neutral-950 to-neutral-450" />
                        
                        <div className="pb-4 border-b border-neutral-150/50 flex items-center justify-between">
                          <h4 className="font-display font-semibold text-neutral-950 uppercase tracking-widest text-[11px] flex items-center gap-2">
                            {editingUser ? 'Изменить карточку сотрудника' : 'Регистрация нового лид-менеджера'}
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              setUserFormOpen(false);
                              setEditingUser(null);
                            }}
                            className="p-1.5 rounded-lg hover:bg-neutral-150/40 cursor-pointer transition duration-300"
                          >
                            <X className="w-4 h-4 text-neutral-950" />
                          </button>
                        </div>

                        {userManageError && (
                          <div className="p-3 bg-red-50/75 border border-red-200/60 rounded-xl font-bold text-red-650 animate-pulse text-[10.5px]">
                            ⚠️ {userManageError}
                          </div>
                        )}
                        {userManageSuccess && (
                          <div className="p-3 bg-emerald-50/75 border border-emerald-200/60 rounded-xl font-bold text-emerald-800 flex items-center gap-1.5 text-[10.5px] shadow-4xs">
                            <Check className="w-4 h-4 text-emerald-700 animate-bounce" />
                            <span>{userManageSuccess}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          
                          <div className="space-y-1.5">
                            <label className="block text-[8.5px] font-bold text-neutral-450 uppercase tracking-widest">ФИО Сотрудника *</label>
                            <input
                              type="text"
                              disabled={!!editingUser}
                              placeholder="Иван Иванов"
                              value={newUserFormState.name}
                              onChange={(e) => setNewUserFormState(prev => ({ ...prev, name: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-white/70 border border-neutral-200/60 focus:border-neutral-950 rounded-xl text-neutral-950 font-bold tracking-tight focus:outline-hidden disabled:bg-neutral-150/30 transition duration-300 shadow-4xs text-[11.5px]"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[8.5px] font-bold text-neutral-450 uppercase tracking-widest">ПИН-код доступа *</label>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Например: 7777"
                              value={newUserFormState.pin}
                              onChange={(e) => setNewUserFormState(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '') }))}
                              className="w-full px-4 py-2.5 bg-white/70 border border-neutral-200/60 focus:border-neutral-950 rounded-xl text-neutral-955 font-mono font-bold text-xs text-center tracking-widest focus:outline-hidden transition duration-300 shadow-4xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[8.5px] font-bold text-neutral-450 uppercase tracking-widest">Роль в системе</label>
                            <select
                              value={newUserFormState.role}
                              onChange={(e) => setNewUserFormState(prev => ({ ...prev, role: e.target.value as any }))}
                              className="w-full px-4 py-2.5 bg-white border border-neutral-200/60 rounded-xl text-neutral-950 font-extrabold focus:outline-hidden cursor-pointer shadow-4xs text-[11.5px] tracking-wide"
                            >
                              <option value="manager">Менеджер отдела продаж</option>
                              <option value="admin">Администратор (Полный доступ)</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[8.5px] font-bold text-neutral-450 uppercase tracking-widest">Отдел / Направление</label>
                            <input
                              type="text"
                              placeholder="Отдел продаж"
                              value={newUserFormState.department}
                              onChange={(e) => setNewUserFormState(prev => ({ ...prev, department: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-white/70 border border-neutral-200/60 focus:border-neutral-950 rounded-xl text-neutral-950 font-bold tracking-tight focus:outline-hidden transition duration-300 shadow-4xs text-[11.5px]"
                            />
                          </div>

                          <div className="space-y-1.5 md:col-span-2">
                            <label className="block text-[8.5px] font-bold text-neutral-450 uppercase tracking-widest">Краткое описание (Должность)</label>
                            <input
                              type="text"
                              placeholder="Лид-менеджер по сложным предоплатам"
                              value={newUserFormState.bio}
                              onChange={(e) => setNewUserFormState(prev => ({ ...prev, bio: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-white/70 border border-neutral-200/60 focus:border-neutral-950 rounded-xl text-neutral-950 font-bold focus:outline-hidden transition duration-300 shadow-4xs text-[11.5px]"
                            />
                          </div>

                          <div className="space-y-2 md:col-span-3">
                            <label className="block text-[8.5px] font-bold text-neutral-450 uppercase tracking-widest">Цветовой градиент карточки</label>
                            <div className="flex items-center gap-2 flex-wrap">
                              {[
                                { class: 'from-blue-500 to-indigo-500', label: 'Океан' },
                                { class: 'from-purple-550 to-pink-500', label: 'Нео Закат' },
                                { class: 'from-emerald-400 to-teal-500', label: 'Изумруд' },
                                { class: 'from-indigo-600 to-indigo-800', label: 'Космос' },
                                { class: 'from-amber-450 to-orange-500', label: 'Медный' },
                                { class: 'from-cyan-455 to-blue-500', label: 'Бирюзовый' }
                              ].map(color => (
                                <button
                                  type="button"
                                  key={color.class}
                                  onClick={() => setNewUserFormState(prev => ({ ...prev, avatarColor: color.class }))}
                                  className={`px-3.5 py-2 rounded-xl text-[10px] font-bold text-white bg-gradient-to-r ${color.class} cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-4xs ${
                                    newUserFormState.avatarColor === color.class ? 'ring-2 ring-neutral-950 border-transparent scale-102 font-extrabold' : 'border border-neutral-200/10'
                                  }`}
                                >
                                  {color.label}
                                </button>
                              ))}
                            </div>
                          </div>

                        </div>

                        <div className="pt-4 border-t border-neutral-150/40 flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setUserFormOpen(false);
                              setEditingUser(null);
                            }}
                            className="px-4.5 py-2.5 bg-white/60 hover:bg-white border border-neutral-200 text-neutral-600 font-bold rounded-xl cursor-pointer transition text-[10px] uppercase tracking-wider shadow-4xs"
                          >
                            Отмена
                          </button>
                          <button
                            id="submit-user-btn"
                            type="submit"
                            className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold rounded-xl cursor-pointer shadow-sm uppercase tracking-widest text-[10px] transition duration-300"
                          >
                            Сохранить изменения
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Users List administration panel */}
                <div className="spatial-glass rounded-2xl p-6 space-y-6 shadow-sm">
                  <div className="pb-4 border-b border-neutral-150/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-display font-semibold text-neutral-950 text-xs uppercase tracking-widest leading-none">
                        Администрирование Доступов
                      </h3>
                      <p className="text-[10.5px] text-neutral-450 mt-2 font-bold uppercase tracking-wider leading-none">Управляйте учетными карточками отдела и задавайте/изменяйте их уникальные ПИН-коды.</p>
                    </div>

                    {!userFormOpen && (
                      <button
                        id="open-create-user-btn"
                        onClick={() => {
                          setEditingUser(null);
                          setNewUserFormState({
                            name: '',
                            role: 'manager',
                            pin: '',
                            department: 'Отдел продаж',
                            bio: '',
                            avatarColor: 'from-blue-500 to-indigo-500'
                          });
                          setUserFormOpen(true);
                        }}
                        className="px-4.5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold rounded-xl text-[10.5px] uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-sm transition duration-300"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Добавить сотрудника</span>
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-neutral-700 border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-200/60 text-[8.5px] text-neutral-450 uppercase tracking-widest font-extrabold bg-neutral-100/30">
                          <th className="py-3.5 px-4 font-bold">Сотрудник</th>
                          <th className="py-3.5 px-4 font-bold">Роль в CRM</th>
                          <th className="py-3.5 px-4 font-bold">Отдел</th>
                          <th className="py-3.5 px-4 text-center font-bold">Авторизация (PIN)</th>
                          <th className="py-3.5 px-4 text-center font-bold">Действия</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-150/40">
                        {allUsers.map(u => (
                          <tr key={u.name} className="hover:bg-white/45 transition duration-300">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${u.avatarColor || 'from-indigo-500 to-indigo-600'} flex items-center justify-center font-display font-semibold text-white text-[10px] shadow-3xs`}>
                                  {u.name.charAt(0)}
                                </div>
                                <span className="font-bold text-neutral-950 text-xs">{u.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-medium">
                              <span className={`px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase border ${
                                u.role === 'admin' 
                                  ? 'bg-neutral-950 text-white border-neutral-950' 
                                  : 'bg-white/90 text-neutral-500 border-neutral-200/50 shadow-4xs'
                              }`}>
                                {u.role === 'admin' ? 'АДМИНИСТРАТОР' : 'МЕНЕДЖЕР'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-neutral-450 uppercase tracking-wide text-[10px]">
                              {u.department || 'Отдел продаж'}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="font-mono bg-white/80 border border-neutral-200 px-3 py-1 rounded text-neutral-950 font-extrabold shadow-4xs tracking-widest text-xs select-all cursor-pointer" title="Текущий рабочий PIN код">
                                {u.pin}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditUserClick(u)}
                                  className="p-1 px-2.5 bg-white/70 hover:bg-neutral-950 hover:text-white text-neutral-700 border border-neutral-200 rounded-lg cursor-pointer transition flex items-center gap-1 font-bold tracking-wider text-[9px] uppercase leading-none shadow-4xs"
                                  title="Редактировать ФИО, отдел и PIN"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Изменить</span>
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteUser(u.name)}
                                  disabled={u.name === currentUser.name}
                                  className="p-1.5 bg-white/60 hover:bg-red-55 hover:text-red-700 text-neutral-550 border border-neutral-200 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-550 rounded-lg cursor-pointer transition shadow-4xs"
                                  title="Удалить сотрудника из CRM"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}
