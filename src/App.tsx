import React, { useState, useEffect, useCallback, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';

import { useData }           from './hooks/useData';
import { api }               from './api/client';
import type { LeadReport, CommissionRules, StaffMember } from './types';

import LoginPage             from './pages/LoginPage';
import DashboardPage         from './pages/DashboardPage';
import LeadsPage             from './pages/LeadsPage';
import UserManagementPage    from './pages/UserManagementPage';
import CheckinPage           from './pages/CheckinPage';
import ShiftManagementPage   from './pages/ShiftManagementPage';
import Sidebar               from './components/Sidebar';
import Header                from './components/Header';
import SalarySummary         from './components/SalarySummary';
import LeadForm              from './components/LeadForm';

type ActiveMenu = 'dashboard' | 'leads' | 'salary' | 'user_management' | 'checkin' | 'shift_management';

class PageErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) { console.error('[PageErrorBoundary]', err); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Произошла ошибка на этой странице</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-neutral-950 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl cursor-pointer"
          >
            Повторить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const SESSION_KEY = 'vivi_marketing_session';

const PAGE_TRANSITION = {
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  exit:       { opacity: 0 },
  transition: { duration: 0.15, ease: 'easeOut' },
};

export default function App() {
  const { leads, rules, allUsers, loading, refreshLeads, refreshRules, refreshUsers, initialize, applyLeadOptimistic, removeLeadOptimistic } = useData();

  const [currentUser, setCurrentUser]   = useState<StaffMember | null>(null);
  const [isAuthenticated, setAuth]      = useState(false);
  const [activeMenu, setActiveMenu]     = useState<ActiveMenu>('dashboard');
  const [isFormOpen, setIsFormOpen]     = useState(false);
  const [editingLead, setEditingLead]   = useState<LeadReport | null>(null);
  const [managerShiftActive, setManagerShiftActive] = useState<boolean | null>(null);

  useEffect(() => {
    initialize().then(() => {
      try {
        const stored = localStorage.getItem(SESSION_KEY);
        if (stored) {
          const user = JSON.parse(stored) as StaffMember;
          setCurrentUser(user);
          setAuth(true);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshLeads();
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [isAuthenticated, refreshLeads]);

  const handleLogin = useCallback((user: StaffMember) => {
    setCurrentUser(user);
    setAuth(true);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    Promise.all([refreshLeads(), refreshRules(), refreshUsers()]);
  }, [refreshLeads, refreshRules, refreshUsers]);

  const handleLogout = useCallback(() => {
    setAuth(false);
    setCurrentUser(null);
    setActiveMenu('dashboard');
    setIsFormOpen(false);
    setEditingLead(null);
    setManagerShiftActive(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  const handleShiftChange = useCallback((active: boolean) => {
    setManagerShiftActive(active);
    if (!active && activeMenu === 'leads') {
      setActiveMenu('dashboard');
    }
  }, [activeMenu]);

  const handleSaveLead = useCallback(async (lead: LeadReport): Promise<boolean> => {
    try {
      const result = await api.leads.save(lead);
      const savedLead: LeadReport = { ...lead, id: lead.id || result.id };
      applyLeadOptimistic(savedLead);
      setIsFormOpen(false);
      setEditingLead(null);
      window.dispatchEvent(new CustomEvent('viviapp:lead-saved'));
      refreshLeads();
      return true;
    } catch (err) {
      console.error('[App] Save lead error:', err);
      return false;
    }
  }, [refreshLeads, applyLeadOptimistic]);

  const handleDeleteLead = useCallback(async (id: string): Promise<void> => {
    try {
      removeLeadOptimistic(id);
      await api.leads.delete(id);
      refreshLeads();
    } catch (err) {
      console.error('[App] Delete lead error:', err);
      refreshLeads();
    }
  }, [refreshLeads, removeLeadOptimistic]);

  const handleSaveRules = useCallback(async (newRules: CommissionRules): Promise<boolean> => {
    try {
      await api.rules.save(newRules);
      await refreshRules();
      return true;
    } catch (err) {
      console.error('[App] Save rules error:', err);
      return false;
    }
  }, [refreshRules]);

  const handleEditLead = useCallback((lead: LeadReport) => {
    setEditingLead(lead);
    setIsFormOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsFormOpen(false);
    setEditingLead(null);
  }, []);

  const openNewForm = useCallback(() => {
    setEditingLead(null);
    setIsFormOpen(true);
  }, []);

  const navigate = useCallback((menu: ActiveMenu) => {
    setActiveMenu(menu);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/60 via-slate-50 to-indigo-100/25 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Загрузка системы...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const myLeadsCount = currentUser.role === 'admin'
    ? leads.length
    : leads.filter(l => l.managerName === currentUser.name).length;

  const todayMsk = new Date().toLocaleDateString('sv', { timeZone: 'Europe/Moscow' });
  const checkinCount = leads.filter(l => {
    const d = l.bookingDate ? String(l.bookingDate).slice(0, 10) : '';
    return d < todayMsk
      && (l.status === 'booked' || l.status === 'rescheduled')
      && (currentUser.role === 'admin' || l.managerName === currentUser.name);
  }).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-indigo-50/20 to-slate-100/60 text-slate-800 flex flex-col lg:flex-row antialiased font-sans">
      <Sidebar
        currentUser={currentUser}
        activeMenu={activeMenu}
        onNavigate={navigate}
        totalLeadsCount={myLeadsCount}
        checkinCount={checkinCount}
        onLogout={handleLogout}
        shiftActive={currentUser.role === 'manager' ? (managerShiftActive ?? undefined) : undefined}
        onShiftChange={currentUser.role === 'manager' ? handleShiftChange : undefined}
      />

      <main className="flex-1 flex flex-col min-w-0 z-10 relative">
        <Header activeMenu={activeMenu} />

        <div className="flex-1 p-5 lg:p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {activeMenu === 'dashboard' && (
              <motion.div key="dashboard" {...PAGE_TRANSITION}>
                <DashboardPage
                  leads={leads}
                  rules={rules}
                  allUsers={allUsers}
                  currentUser={currentUser}
                  onNavigate={navigate}
                />
              </motion.div>
            )}

            {activeMenu === 'leads' && (
              <motion.div key="leads" {...PAGE_TRANSITION}>
                <LeadsPage
                  leads={leads}
                  currentUser={currentUser}
                  onEditLead={handleEditLead}
                  onDeleteLead={handleDeleteLead}
                  shiftActive={currentUser.role === 'manager' ? (managerShiftActive ?? undefined) : undefined}
                />
              </motion.div>
            )}

            {activeMenu === 'salary' && (
              <motion.div key="salary" {...PAGE_TRANSITION}>
                <SalarySummary
                  leads={leads}
                  rules={rules}
                  onSaveRules={handleSaveRules}
                  currentUserRole={currentUser.role}
                  currentManagerName={currentUser.name}
                />
              </motion.div>
            )}

            {activeMenu === 'user_management' && currentUser.role === 'admin' && (
              <motion.div key="users" {...PAGE_TRANSITION}>
                <UserManagementPage
                  allUsers={allUsers}
                  currentUserName={currentUser.name}
                  onRefresh={refreshUsers}
                />
              </motion.div>
            )}

            {activeMenu === 'checkin' && (
              <motion.div key="checkin" {...PAGE_TRANSITION}>
                <PageErrorBoundary>
                  <CheckinPage
                    currentUser={currentUser}
                    onRefreshLeads={refreshLeads}
                    onEditLead={handleEditLead}
                    allUsers={allUsers}
                  />
                </PageErrorBoundary>
              </motion.div>
            )}

            {activeMenu === 'shift_management' && currentUser.role === 'admin' && (
              <motion.div key="shift_management" {...PAGE_TRANSITION}>
                <ShiftManagementPage allUsers={allUsers} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating sticky button — managers only, only when shift is active */}
      {currentUser.role === 'manager' && managerShiftActive === true && (
        <button
          onClick={openNewForm}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-2xl shadow-[0_8px_28px_-4px_rgba(79,70,229,0.55)] hover:shadow-[0_8px_32px_-4px_rgba(79,70,229,0.7)] transition-all duration-200 cursor-pointer text-[11px] uppercase tracking-widest active:scale-95"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden sm:block">Внести запись</span>
        </button>
      )}

      {/* Modal overlay */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div
              className="absolute inset-0 bg-black/40"
              onClick={closeModal}
            />

            <motion.div
              className="relative w-full sm:max-w-2xl max-h-[95dvh] sm:max-h-[88vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <LeadForm
                initialLead={editingLead}
                currentUserRole={currentUser.role}
                currentManagerName={currentUser.name}
                staffList={allUsers}
                onSave={handleSaveLead}
                onCancel={closeModal}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
