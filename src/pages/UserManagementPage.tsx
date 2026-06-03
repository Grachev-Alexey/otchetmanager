import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Edit, Trash2, Check } from 'lucide-react';
import { api, ApiError } from '../api/client';
import type { StaffMember } from '../types';

const AVATAR_COLORS = [
  { class: 'from-blue-500 to-indigo-500',   label: 'Океан' },
  { class: 'from-purple-500 to-pink-500',    label: 'Закат' },
  { class: 'from-emerald-400 to-teal-500',   label: 'Изумруд' },
  { class: 'from-indigo-600 to-indigo-800',  label: 'Космос' },
  { class: 'from-amber-400 to-orange-500',   label: 'Медный' },
  { class: 'from-cyan-400 to-blue-500',      label: 'Бирюза' },
];

const EMPTY_FORM = {
  name: '', role: 'manager' as 'admin' | 'manager',
  pin: '', department: 'Отдел продаж', bio: '',
  avatarColor: 'from-blue-500 to-indigo-500',
};

interface Props {
  allUsers: StaffMember[];
  currentUserName: string;
  onRefresh: () => Promise<void>;
}

export default function UserManagementPage({ allUsers, currentUserName, onRefresh }: Props) {
  const [formOpen, setFormOpen]       = useState(false);
  const [editingUser, setEditingUser] = useState<StaffMember | null>(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [saving, setSaving]           = useState(false);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setError(''); setSuccess('');
    setFormOpen(true);
  };

  const openEdit = (user: StaffMember) => {
    setEditingUser(user);
    setForm({ name: user.name, role: user.role, pin: user.pin, department: user.department, bio: user.bio || '', avatarColor: user.avatarColor || EMPTY_FORM.avatarColor });
    setError(''); setSuccess('');
    setFormOpen(true);
  };

  const closeForm = () => { setFormOpen(false); setEditingUser(null); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.pin) { setError('ФИО и ПИН-код обязательны'); return; }
    setError(''); setSaving(true);
    try {
      await api.users.save({ ...form, status: editingUser?.status || 'offline', lastActive: editingUser?.lastActive || 'Не в сети' });
      setSuccess(editingUser ? 'Сотрудник обновлён' : 'Сотрудник зарегистрирован');
      await onRefresh();
      setTimeout(() => { setSuccess(''); closeForm(); }, 1200);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Ошибка соединения с базой');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`Вы уверены, что хотите удалить сотрудника ${name}?`)) return;
    try {
      await api.users.delete(name);
      await onRefresh();
    } catch (err) {
      console.error('[UserMgmt] Delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSave} className="spatial-glass p-6 rounded-2xl space-y-5 shadow-sm text-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neutral-950 to-neutral-400" />

              <div className="pb-4 border-b border-neutral-100/50 flex items-center justify-between">
                <h4 className="font-display font-semibold text-neutral-950 uppercase tracking-widest text-[11px]">
                  {editingUser ? 'Изменить карточку сотрудника' : 'Регистрация нового лид-менеджера'}
                </h4>
                <button type="button" onClick={closeForm} className="p-1.5 rounded-lg hover:bg-neutral-100/40 cursor-pointer transition duration-300">
                  <X className="w-4 h-4 text-neutral-950" />
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50/75 border border-red-200/60 rounded-xl font-bold text-red-600 text-[10.5px]">⚠️ {error}</div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50/75 border border-emerald-200/60 rounded-xl font-bold text-emerald-800 flex items-center gap-1.5 text-[10.5px]">
                  <Check className="w-4 h-4 text-emerald-700" /> {success}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-[8.5px] font-bold text-neutral-400 uppercase tracking-widest">ФИО Сотрудника *</label>
                  <input type="text" disabled={!!editingUser} placeholder="Иван Иванов" value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/70 border border-neutral-200/60 focus:border-neutral-950 rounded-xl text-neutral-950 font-bold focus:outline-hidden disabled:bg-neutral-100/30 transition duration-300 shadow-sm text-[11.5px]" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[8.5px] font-bold text-neutral-400 uppercase tracking-widest">ПИН-код доступа *</label>
                  <input type="text" maxLength={6} placeholder="Например: 7777" value={form.pin}
                    onChange={e => setForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, '') }))}
                    className="w-full px-4 py-2.5 bg-white/70 border border-neutral-200/60 focus:border-neutral-950 rounded-xl text-neutral-950 font-mono font-bold text-xs text-center tracking-widest focus:outline-hidden transition duration-300 shadow-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[8.5px] font-bold text-neutral-400 uppercase tracking-widest">Роль в системе</label>
                  <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as any }))}
                    className="w-full px-4 py-2.5 bg-white border border-neutral-200/60 rounded-xl text-neutral-950 font-extrabold focus:outline-hidden cursor-pointer shadow-sm text-[11.5px] tracking-wide">
                    <option value="manager">Менеджер отдела продаж</option>
                    <option value="admin">Администратор (Полный доступ)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[8.5px] font-bold text-neutral-400 uppercase tracking-widest">Отдел / Направление</label>
                  <input type="text" placeholder="Отдел продаж" value={form.department}
                    onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/70 border border-neutral-200/60 focus:border-neutral-950 rounded-xl text-neutral-950 font-bold focus:outline-hidden transition duration-300 shadow-sm text-[11.5px]" />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-[8.5px] font-bold text-neutral-400 uppercase tracking-widest">Краткое описание (Должность)</label>
                  <input type="text" placeholder="Лид-менеджер по сложным предоплатам" value={form.bio}
                    onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white/70 border border-neutral-200/60 focus:border-neutral-950 rounded-xl text-neutral-950 font-bold focus:outline-hidden transition duration-300 shadow-sm text-[11.5px]" />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <label className="block text-[8.5px] font-bold text-neutral-400 uppercase tracking-widest">Цветовой градиент карточки</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {AVATAR_COLORS.map(color => (
                      <button type="button" key={color.class}
                        onClick={() => setForm(p => ({ ...p, avatarColor: color.class }))}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-bold text-white bg-gradient-to-r ${color.class} cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm ${form.avatarColor === color.class ? 'ring-2 ring-neutral-950 scale-105' : ''}`}
                      >
                        {color.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100/40 flex items-center justify-end gap-2.5">
                <button type="button" onClick={closeForm}
                  className="px-4.5 py-2.5 bg-white/60 hover:bg-white border border-neutral-200 text-neutral-600 font-bold rounded-xl cursor-pointer transition text-[10px] uppercase tracking-wider shadow-sm">
                  Отмена
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 disabled:bg-neutral-300 text-white font-extrabold rounded-xl cursor-pointer shadow-sm uppercase tracking-widest text-[10px] transition duration-300">
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="spatial-glass rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="pb-4 border-b border-neutral-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-semibold text-neutral-950 text-xs uppercase tracking-widest leading-none">
              Администрирование доступов
            </h3>
            <p className="text-[10.5px] text-neutral-400 mt-2 font-bold uppercase tracking-wider leading-none">
              Управляйте учётными карточками отдела и задавайте уникальные ПИН-коды.
            </p>
          </div>
          {!formOpen && (
            <button onClick={openCreate}
              className="px-4.5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold rounded-xl text-[10.5px] uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-sm transition duration-300">
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить сотрудника</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-neutral-700 border-collapse">
            <thead>
              <tr className="border-b border-neutral-200/60 text-[8.5px] text-neutral-400 uppercase tracking-widest font-extrabold bg-neutral-100/30">
                <th className="py-3.5 px-4 font-bold">Сотрудник</th>
                <th className="py-3.5 px-4 font-bold">Роль в CRM</th>
                <th className="py-3.5 px-4 font-bold">Отдел</th>
                <th className="py-3.5 px-4 text-center font-bold">PIN-код</th>
                <th className="py-3.5 px-4 text-center font-bold">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/40">
              {allUsers.map(u => (
                <tr key={u.name} className="hover:bg-white/45 transition duration-300">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${u.avatarColor || 'from-indigo-500 to-indigo-700'} flex items-center justify-center font-display font-semibold text-white text-[10px] shadow-sm`}>
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-bold text-neutral-950 text-xs">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase border ${u.role === 'admin' ? 'bg-neutral-950 text-white border-neutral-950' : 'bg-white/90 text-neutral-500 border-neutral-200/50 shadow-sm'}`}>
                      {u.role === 'admin' ? 'АДМИНИСТРАТОР' : 'МЕНЕДЖЕР'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-neutral-400 uppercase tracking-wide text-[10px]">
                    {u.department || 'Отдел продаж'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-mono bg-white/80 border border-neutral-200 px-3 py-1 rounded text-neutral-950 font-extrabold shadow-sm tracking-widest text-xs select-all cursor-pointer">
                      {u.pin}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(u)}
                        className="p-1 px-2.5 bg-white/70 hover:bg-neutral-950 hover:text-white text-neutral-700 border border-neutral-200 rounded-lg cursor-pointer transition flex items-center gap-1 font-bold tracking-wider text-[9px] uppercase leading-none shadow-sm">
                        <Edit className="w-3.5 h-3.5" />
                        <span>Изменить</span>
                      </button>
                      <button
                        onClick={() => handleDelete(u.name)}
                        disabled={u.name === currentUserName}
                        className="p-1.5 bg-white/60 hover:bg-red-50 hover:text-red-700 text-neutral-400 border border-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg cursor-pointer transition shadow-sm">
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
    </div>
  );
}
