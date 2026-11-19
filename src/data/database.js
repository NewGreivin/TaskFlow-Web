import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'taskflow:data:v1';
const StorageContext = createContext(null);

const defaultCategories = [
  ['Trabajo', 'briefcase-outline', '#4E6CFF'],
  ['Estudio', 'school-outline', '#7C5CFC'],
  ['Personal', 'account-outline', '#36B37E'],
  ['Salud', 'heart-outline', '#FF4D6D'],
  ['Finanzas', 'cash', '#F3B51B'],
  ['Hogar', 'home-outline', '#FF8A4C'],
  ['Otras', 'dots-horizontal', '#8A8F9F'],
].map(([name, icon, color], index) => ({
  id: index + 1,
  name,
  icon,
  color,
  created_at: new Date().toISOString(),
}));

const defaultState = () => ({
  categories: defaultCategories,
  projects: [],
  tasks: [],
  subtasks: [],
  notifications: [],
  settings: [{
    id: 1,
    theme: 'system',
    language: 'es',
    notifications_enabled: 1,
    first_day_of_week: 'Lunes',
    notif_reminders: 1,
    notif_anticipation: 15,
    notif_summary: 0,
    notif_summary_time: '20:00',
    notif_overdue: 0,
    notif_completed: 0,
    notif_date_changed: 0,
    notif_sound: 1,
    notif_vibration: 1,
    notif_days: 'Lunes,Martes,Miércoles,Jueves,Viernes,Sábado,Domingo',
  }],
});

function readState() {
  if (typeof window === 'undefined') return defaultState();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState();
    const parsed = JSON.parse(stored);
    return { ...defaultState(), ...parsed };
  } catch (error) {
    console.warn('No se pudo leer el almacenamiento local de TaskFlow', error);
    return defaultState();
  }
}

function writeState(state) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('taskflow-storage-change'));
  }
}

function nextId(rows) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

export function createLocalStorageDb() {
  const read = () => readState();
  const write = (state) => writeState(state);

  return {
    read,
    write,
    async getAllAsync(query, ...params) {
      const state = read();
      const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();
      if (normalized === 'select * from categories') return state.categories;
      if (normalized === 'select * from projects') return state.projects;
      if (normalized === 'select * from tasks') return state.tasks;
      if (normalized === 'select * from subtasks') return state.subtasks;
      if (normalized === 'select * from notifications') return state.notifications;
      if (normalized === 'select * from settings') return state.settings;
      if (normalized.includes('from notifications n') && normalized.includes('inner join tasks')) {
        return state.notifications
          .map((notification) => {
            const task = state.tasks.find((item) => item.id === notification.task_id);
            return task ? {
              id: notification.id,
              notification_id: notification.notification_id,
              scheduled_at: notification.scheduled_at,
              status: notification.status,
              task_id: task.id,
              title: task.title,
              due_date: task.due_date,
              due_time: task.due_time,
              task_status: task.status,
            } : null;
          })
          .filter(Boolean)
          .sort((a, b) => String(a.scheduled_at || '').localeCompare(String(b.scheduled_at || '')));
      }
      if (normalized.includes('select notification_id from notifications')) {
        return state.notifications
          .filter((item) => item.task_id === Number(params[0]))
          .map((item) => ({ notification_id: item.notification_id }));
      }
      return [];
    },
    async getFirstAsync(query, ...params) {
      const state = read();
      const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();
      if (normalized.includes('count(*)') && normalized.includes('from categories')) {
        return { count: state.categories.length };
      }
      if (normalized.includes('count(*)') && normalized.includes('from tasks')) {
        return { count: state.tasks.length };
      }
      if (normalized.includes('count(*)') && normalized.includes('from subtasks')) {
        return { count: state.subtasks.length };
      }
      if (normalized.includes('count(*)') && normalized.includes('from notifications')) {
        return { count: state.notifications.length };
      }
      if (normalized.includes('from settings')) {
        return state.settings[0] || null;
      }
      if (normalized.includes('from notifications')) {
        return state.notifications.filter((item) => item.task_id === Number(params[0])).at(-1) || null;
      }
      return null;
    },
    async runAsync(query, ...params) {
      const state = read();
      const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();
      if (normalized.startsWith('update settings set')) {
        const key = query.match(/SET\s+([a-z_]+)\s*=/i)?.[1];
        if (key) state.settings[0] = { ...state.settings[0], [key]: params[0] };
      } else if (normalized.startsWith('delete from ')) {
        const table = normalized.match(/^delete from ([a-z_]+)/)?.[1];
        if (table && state[table]) {
          const id = params[0];
          state[table] = id === undefined ? [] : state[table].filter((item) =>
            !((table === 'notifications' || table === 'subtasks') ? item.task_id === Number(id) : item.id === Number(id))
          );
        }
      } else if (normalized.includes('insert into notifications')) {
        state.notifications.push({
          id: nextId(state.notifications),
          task_id: Number(params[0]),
          notification_id: params[1],
          scheduled_at: params[2],
          status: 'scheduled',
        });
      }
      write(state);
      return { lastInsertRowId: nextId(state.tasks) - 1 };
    },
    async execAsync(query) {
      const state = read();
      const matches = [...query.toLowerCase().matchAll(/delete from ([a-z_]+)/g)];
      for (const match of matches) {
        if (state[match[1]]) state[match[1]] = [];
      }
      write(state);
    },
    async withTransactionAsync(callback) {
      await callback();
    },
  };
}

export function LocalStorageProvider({ children }) {
  const [, forceUpdate] = useState(0);
  const db = useMemo(() => createLocalStorageDb(), []);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const listener = () => forceUpdate((value) => value + 1);
    window.addEventListener('taskflow-storage-change', listener);
    return () => window.removeEventListener('taskflow-storage-change', listener);
  }, [forceUpdate]);
  return <StorageContext.Provider value={db}>{children}</StorageContext.Provider>;
}

export function useLocalStorageContext() {
  const value = useContext(StorageContext);
  if (!value) throw new Error('useLocalStorageContext must be used inside LocalStorageProvider');
  return value;
}
