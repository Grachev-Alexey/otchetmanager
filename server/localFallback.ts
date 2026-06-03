import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
export const RULES_FILE = path.join(DATA_DIR, 'rules.json');
export const USERS_FILE = path.join(DATA_DIR, 'users.json');

export const DEFAULT_RULES = {
  perShowUpHigh: 350,
  perShowUpLow:  200,
  perPoHigh:     150,
  perPoLow:      100,
  hourlyRate:    85,
  poThreshold:   140,
};

export const DEFAULT_USERS = [
  { name: 'Александр Г.', role: 'admin', pin: '1111', department: 'Руководитель', bio: 'Управление KPI, структурой и бюджетом', avatarColor: 'from-indigo-500 to-indigo-700', status: 'online', lastActive: 'В сети' },
  { name: 'Мария С.', role: 'admin', pin: '2222', department: 'Тех. Администратор', bio: 'Аудит и верификация AmoCRM статусов', avatarColor: 'from-purple-500 to-pink-500', status: 'online', lastActive: '10 мин назад' },
  { name: 'Алина К.', role: 'manager', pin: '3333', department: 'Старший лид-менеджер', bio: 'Специалист по работе с клиентами повышенной категории', avatarColor: 'from-emerald-400 to-teal-500', status: 'online', lastActive: 'В сети' },
  { name: 'Иван П.', role: 'manager', pin: '4444', department: 'Лид-менеджер', bio: 'Фокус на закрытии предоплат и визитов', avatarColor: 'from-blue-500 to-indigo-500', status: 'offline', lastActive: '1 час назад' },
  { name: 'Маргарита Д.', role: 'manager', pin: '5555', department: 'Лид-менеджер', bio: 'Работа с повторными контактами и холодным трафиком', avatarColor: 'from-amber-400 to-orange-500', status: 'online', lastActive: '3 мин назад' },
  { name: 'Сергей В.', role: 'manager', pin: '6666', department: 'Лид-менеджер', bio: 'Ведение сделок со сложными условиями финансирования', avatarColor: 'from-cyan-400 to-blue-500', status: 'online', lastActive: 'В сети' },
];

if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, '[]', 'utf-8');
if (!fs.existsSync(RULES_FILE)) fs.writeFileSync(RULES_FILE, JSON.stringify(DEFAULT_RULES, null, 2), 'utf-8');
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');

function safeRead<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; }
}

export const readLocalLeads  = (): any[]  => safeRead(LEADS_FILE, []);
export const writeLocalLeads = (data: any) => fs.writeFileSync(LEADS_FILE, JSON.stringify(data, null, 2), 'utf-8');

export const readLocalRules  = () => safeRead(RULES_FILE, DEFAULT_RULES);
export const writeLocalRules = (rules: any) => fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), 'utf-8');

export const readLocalUsers  = (): any[] => safeRead(USERS_FILE, DEFAULT_USERS);
export const writeLocalUsers = (users: any) => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
