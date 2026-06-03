import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CommissionRules, LeadReport, ManagerPerformance } from '../types';
import { Settings, Save, Star, Sparkles, TrendingUp, Award, Check } from 'lucide-react';

interface SalarySummaryProps {
  leads: LeadReport[];
  rules: CommissionRules;
  onSaveRules: (newRules: CommissionRules) => Promise<boolean>;
  currentUserRole: 'admin' | 'manager';
  currentManagerName: string;
}

export default function SalarySummary({
  leads,
  rules,
  onSaveRules,
  currentUserRole,
  currentManagerName
}: SalarySummaryProps) {
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [editedRules, setEditedRules] = useState<CommissionRules>({ ...rules });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setEditedRules({ ...rules });
  }, [rules]);

  // Handle local form edit
  const handleRuleChange = (field: keyof CommissionRules, val: number) => {
    setEditedRules(prev => ({
      ...prev,
      [field]: isNaN(val) ? 0 : val
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveSuccess(false);

    const isOk = await onSaveRules(editedRules);
    setSaveLoading(false);

    if (isOk) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditingRules(false);
      }, 1500);
    }
  };

  // Group performance variables based on leads data
  const calculatePerformances = (): ManagerPerformance[] => {
    // 1. Group leads by managerName
    const managers = Array.from(new Set(leads.map(l => l.managerName).filter(Boolean)));
    
    // If current user is manager, restrict to them
    const activeManagers = currentUserRole === 'admin' 
      ? managers 
      : managers.filter(m => m === currentManagerName);

    // If there is no lead data yet, return empty
    if (activeManagers.length === 0 && currentUserRole === 'manager') {
      activeManagers.push(currentManagerName);
    }

    return activeManagers.map(managerName => {
      const managerLeads = leads.filter(l => l.managerName === managerName);
      
      const totalBookings = managerLeads.filter(l => l.status === 'booked' || l.status === 'showed_up').length;
      const totalDeposits = managerLeads.filter(l => l.depositPaid).length;
      const totalShowUps = managerLeads.filter(l => l.status === 'showed_up').length;
      const totalNoShows = managerLeads.filter(l => l.status === 'no_show').length;

      // Earned commissions calculated by rules formulas
      const bookingCommission = totalBookings * rules.perBooking;
      const depositCommission = totalDeposits * rules.perDepositCollected;
      const showUpCommission = totalShowUps * rules.perShowUp;
      const earnedCommissions = bookingCommission + depositCommission + showUpCommission;

      const isBonusAchieved = totalBookings >= rules.targetBookings;
      const bonusEarned = isBonusAchieved ? rules.bonusAmount : 0;
      const totalSalary = rules.baseSalary + earnedCommissions + bonusEarned;

      return {
        managerName,
        totalBookings,
        totalDeposits,
        totalShowUps,
        totalNoShows,
        earnedCommissions,
        isBonusAchieved,
        bonusEarned,
        totalSalary,
        leads: managerLeads
      };
    });
  };

  const performances = calculatePerformances();

  return (
    <div className="space-y-6">
      
      {/* 1. Rules Settings - Admin Only */}
      {currentUserRole === 'admin' && (
        <div className="spatial-glass rounded-3xl overflow-hidden transition-all duration-300">
          <div className="p-5 flex items-center justify-between border-b border-neutral-150/40 relative z-10">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-neutral-500 animate-spin" style={{ animationDuration: '8s' }} />
              <h3 className="font-display font-semibold text-neutral-950 text-xs uppercase tracking-wider">
                Настройки зарплат и бонусов
              </h3>
            </div>
            
            <button
              id="toggle-rules-editor-btn"
              onClick={() => setIsEditingRules(!isEditingRules)}
              className="px-4 py-2 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 hover:text-neutral-950 bg-white/40 border border-neutral-200/60 rounded-xl transition-all duration-300 cursor-pointer shadow-3xs active:scale-95 hover:bg-white/80"
            >
              {isEditingRules ? 'Свернуть' : '⚙️ Редактировать'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {isEditingRules ? (
              <motion.form 
                key="rules-form-editing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                onSubmit={handleSave} 
                className="p-6 border-t border-neutral-150/40 space-y-6 relative z-10"
              >
                {saveSuccess && (
                  <div className="p-3 bg-neutral-950 text-white text-[11px] font-bold rounded-xl text-center shadow-2xs uppercase tracking-wider">
                    ✓ Параметры расчета обновлены в системе!
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-neutral-700">
                  
                  <div className="space-y-1.5">
                    <label className="block text-[8.5px] uppercase font-bold tracking-wider text-neutral-450 leading-none mb-1">Базовый оклад отдела (₽) *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-neutral-400 font-bold">₽</span>
                      <input
                        id="input-rule-baseSalary"
                        type="number"
                        value={editedRules.baseSalary}
                        onChange={(e) => handleRuleChange('baseSalary', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-150/60 rounded-xl text-neutral-900 font-semibold focus:border-neutral-900 focus:outline-hidden focus:bg-white transition-all duration-300 shadow-3xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[8.5px] uppercase font-bold tracking-wider text-neutral-450 leading-none mb-1">За регистрацию записи (₽)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-neutral-400 font-bold">₽</span>
                      <input
                        id="input-rule-perBooking"
                        type="number"
                        value={editedRules.perBooking}
                        onChange={(e) => handleRuleChange('perBooking', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-150/60 rounded-xl text-neutral-900 font-semibold focus:border-neutral-900 focus:outline-hidden focus:bg-white transition-all duration-300 shadow-3xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[8.5px] uppercase font-bold tracking-wider text-neutral-450 leading-none mb-1">За внесенную предоплату (₽)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-neutral-400 font-bold">₽</span>
                      <input
                        id="input-rule-perDepositCollected"
                        type="number"
                        value={editedRules.perDepositCollected}
                        onChange={(e) => handleRuleChange('perDepositCollected', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-150/60 rounded-xl text-neutral-900 font-semibold focus:border-neutral-900 focus:outline-hidden focus:bg-white transition-all duration-300 shadow-3xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[8.5px] uppercase font-bold tracking-wider text-neutral-450 leading-none mb-1">За состоявшийся визит (₽)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-neutral-400 font-bold">₽</span>
                      <input
                        id="input-rule-perShowUp"
                        type="number"
                        value={editedRules.perShowUp}
                        onChange={(e) => handleRuleChange('perShowUp', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-150/60 rounded-xl text-neutral-900 font-semibold focus:border-neutral-900 focus:outline-hidden focus:bg-white transition-all duration-300 shadow-3xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[8.5px] uppercase font-bold tracking-wider text-neutral-450 leading-none mb-1">Целевой план (Записи, шт)</label>
                    <input
                      id="input-rule-targetBookings"
                      type="number"
                      value={editedRules.targetBookings}
                      onChange={(e) => handleRuleChange('targetBookings', parseInt(e.target.value))}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-150/60 rounded-xl text-neutral-900 font-semibold focus:border-neutral-900 focus:outline-hidden focus:bg-white transition-all duration-300 shadow-3xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[8.5px] uppercase font-bold tracking-wider text-neutral-450 leading-none mb-1">Бонус за выполнение плана (₽)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-neutral-400 font-bold">₽</span>
                      <input
                        id="input-rule-bonusAmount"
                        type="number"
                        value={editedRules.bonusAmount}
                        onChange={(e) => handleRuleChange('bonusAmount', parseInt(e.target.value))}
                        className="w-full pl-8 pr-4 py-3 bg-neutral-50 border border-neutral-150/60 rounded-xl text-neutral-900 font-semibold focus:border-neutral-900 focus:outline-hidden focus:bg-white transition-all duration-300 shadow-3xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3.5 pt-4 border-t border-neutral-150/40">
                  <button
                    type="button"
                    onClick={() => {
                      setEditedRules({ ...rules });
                      setIsEditingRules(false);
                    }}
                    className="px-5 py-3 bg-white/40 hover:bg-white/70 border border-neutral-200 text-neutral-600 rounded-xl text-[10.5px] uppercase tracking-wider font-bold transition-all duration-300 cursor-pointer shadow-3xs active:scale-95"
                  >
                    Отмена
                  </button>
                  <button
                    id="save-rules-submit-btn"
                    type="submit"
                    disabled={saveLoading}
                    className="px-6 py-3 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-200 text-white rounded-xl text-[10.5px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all duration-300 shadow-sm active:scale-95 hover:scale-[1.01]"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saveLoading ? 'Синхронизация...' : 'Сохранить правила'}</span>
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div 
                key="rules-overview-grid"
                className="p-5 grid grid-cols-2 lg:grid-cols-6 gap-4 text-center border-t border-neutral-150/30 relative z-10"
              >
                {[
                  { label: 'Базовый оклад', val: `${rules.baseSalary.toLocaleString()} ₽` },
                  { label: 'За каждую запись', val: `+${rules.perBooking.toLocaleString()} ₽` },
                  { label: 'За предоплату', val: `+${rules.perDepositCollected.toLocaleString()} ₽` },
                  { label: 'За визит клиента', val: `+${rules.perShowUp.toLocaleString()} ₽` },
                  { label: 'Цель (план)', val: `${rules.targetBookings} записей` },
                  { label: 'Бонус за план', val: `+${rules.bonusAmount.toLocaleString()} ₽` }
                ].map((stat, i) => (
                  <div key={i} className="p-3.5 bg-neutral-50 rounded-2xl border border-white/50 flex flex-col justify-center shadow-3xs transition-shadow hover:shadow-2xs">
                    <p className="text-[8.5px] uppercase font-bold text-neutral-400 mb-1 tracking-wider leading-none">{stat.label}</p>
                    <p className="font-semibold text-xs text-neutral-900 leading-none mt-1.5">{stat.val}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 2. Structured List of Personal Performance Sheets */}
      <div className="space-y-6">
        {performances.length === 0 ? (
          <div className="spatial-glass rounded-3xl p-16 text-center text-xs text-neutral-450 font-medium tracking-wide">
            Для выбранного пользователя пока нет записей в системе.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
            {performances.map((perf, index) => {
              const bookingProgress = Math.min(100, (perf.totalBookings / rules.targetBookings) * 100);
              
              return (
                <motion.div 
                  id={`perf-card-${perf.managerName}`}
                  key={perf.managerName + index} 
                  initial={{ opacity: 0, scale: 0.99 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -3, scale: 1.005, boxShadow: "0 12px 32px rgba(99, 102, 241, 0.05)" }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="spatial-glass rounded-3xl p-6.5 shadow-3xs flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-5">
                    
                    {/* Header bar */}
                    <div className="flex items-center justify-between pb-4.5 border-b border-neutral-150/40">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center font-display font-semibold text-sm shrink-0 shadow-2xs">
                          {perf.managerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-display font-semibold text-neutral-950 text-sm leading-none">{perf.managerName}</h4>
                          <span className="text-[8.5px] text-neutral-400 font-extrabold uppercase tracking-widest block mt-1.5 label-tag-status">
                            Лист начисления результатов
                          </span>
                        </div>
                      </div>

                      {perf.isBonusAchieved ? (
                        <div className="flex items-center gap-1.5 bg-emerald-600 text-white px-2.5 py-1 rounded-xl text-[8.5px] font-bold uppercase tracking-wider shadow-[0_3px_11px_-2px_rgba(16,185,129,0.4)] animate-pulse border border-emerald-500">
                          <Award className="w-3.5 h-3.5 text-white fill-white" />
                          <span>План выполнен</span>
                        </div>
                      ) : (
                        <div className="text-[8.5px] font-bold uppercase tracking-wider text-neutral-500 bg-white/60 border border-neutral-200/50 px-2.5 py-1 rounded-xl shadow-4xs">
                          ⏳ {perf.totalBookings}/{rules.targetBookings} целей
                        </div>
                      )}
                    </div>

                    {/* Progress Track */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[8.5px] text-neutral-450 font-extrabold uppercase tracking-widest">
                        <span>Прогресс выполнения плана KPI по записям</span>
                        <span className="text-neutral-950 font-bold">{Math.round(bookingProgress)}%</span>
                      </div>
                      <div className="w-full bg-white/60 h-2 rounded-full overflow-hidden border border-white/40">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 flex items-center justify-end pr-1 shadow-3xs"
                          style={{ width: `${bookingProgress}%` }}
                        >
                          <div className="w-1 h-1 rounded-full bg-white animate-ping" />
                        </div>
                      </div>
                    </div>

                    {/* Basic counters breakdown */}
                    <div className="grid grid-cols-4 gap-2.5 mb-3 text-center">
                      {[
                        { label: 'Записи', count: perf.totalBookings },
                        { label: 'Предоплаты', count: perf.totalDeposits },
                        { label: 'Визиты', count: perf.totalShowUps },
                        { label: 'Не пришли', count: perf.totalNoShows },
                      ].map((stat, i) => (
                        <div key={i} className="p-2.5 bg-neutral-50 rounded-xl border border-white/50 shadow-4xs">
                          <span className="text-[8px] text-neutral-400 block font-bold uppercase tracking-wider leading-none">{stat.label}</span>
                          <span className="font-bold text-xs block mt-2 text-neutral-900 leading-none">{stat.count}</span>
                        </div>
                      ))}
                    </div>

                    {/* Calculation breakdown */}
                    <div className="space-y-2.5 pt-4 border-t border-neutral-150/40 text-[11px] text-neutral-500 leading-relaxed font-semibold">
                      <div className="flex justify-between">
                        <span>Гарантированный базовый оклад:</span>
                        <span className="font-semibold text-neutral-700">{rules.baseSalary.toLocaleString()} ₽</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Записи ({perf.totalBookings} × {rules.perBooking} ₽):</span>
                        <span className="font-semibold text-neutral-700">+{((perf.totalBookings * rules.perBooking)).toLocaleString()} ₽</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Внесенные предоплаты ({perf.totalDeposits} × {rules.perDepositCollected} ₽):</span>
                        <span className="font-semibold text-neutral-700">+{((perf.totalDeposits * rules.perDepositCollected)).toLocaleString()} ₽</span>
                      </div>

                      <div className="flex justify-between">
                        <span>Подтвержденные визиты ({perf.totalShowUps} × {rules.perShowUp} ₽):</span>
                        <span className="font-semibold text-neutral-700">+{((perf.totalShowUps * rules.perShowUp)).toLocaleString()} ₽</span>
                      </div>

                      {perf.isBonusAchieved && (
                        <div className="flex justify-between text-neutral-950 font-bold bg-white border border-neutral-200/60 p-3 rounded-2xl mt-3 shadow-3xs relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-12 h-12 bg-neutral-100/10 rounded-full blur-xl pointer-events-none" />
                          <span className="flex items-center gap-1.5 relative z-10 text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-neutral-800 shrink-0" />
                            Бонус за выполнение плана KPI:
                          </span>
                          <span className="relative z-10">+{rules.bonusAmount.toLocaleString()} ₽</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grand total yield display block */}
                  <div className="mt-5 border-t border-neutral-150/40 pt-4 flex items-center justify-between">
                    <div>
                      <span className="text-[8.5px] text-neutral-400 font-bold uppercase tracking-widest block label-tag">Итоговое начисление</span>
                      <p className="font-display text-xl font-bold text-neutral-950 tracking-tight mt-1">
                        {perf.totalSalary.toLocaleString()} ₽
                      </p>
                    </div>
                    
                    <div className="p-2.5 border border-neutral-150/80 rounded-xl text-neutral-600 bg-neutral-50 shadow-3xs hover:bg-neutral-950 hover:text-white transition-all duration-300 cursor-pointer">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
