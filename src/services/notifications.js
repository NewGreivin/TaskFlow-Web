export const REMINDER_OPTIONS = [
  { value: 1440, label: '1 día antes' },
  { value: 60, label: '1 hora antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 5, label: '5 minutos antes' },
  { value: 0, label: 'A la hora de la tarea' },
];

export const RECURRENCE_OPTIONS = ['No se repite', 'Cada día', 'Cada semana', 'Cada mes'];

export async function configureNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission === 'granted'
    : false;
}

function buildTaskDate(dueDate, dueTime) {
  const [year, month, day] = dueDate.split('-').map(Number);
  const [hour = 0, minute = 0] = (dueTime || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function getReminderDate(dueDate, dueTime, reminderMinutes = 30) {
  return new Date(buildTaskDate(dueDate, dueTime).getTime() - Number(reminderMinutes) * 60 * 1000);
}

export async function scheduleTaskNotification() {
  return null;
}

export async function cancelTaskNotification() {}
