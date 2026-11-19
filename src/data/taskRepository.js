const now = () => new Date().toISOString();
const numberId = (id) => Number(id);
const sortTasks = (a, b) => {
  const statusOrder = { Pendiente: 1, 'En progreso': 2, Completada: 3, Terminada: 3 };
  const priorityOrder = { Urgente: 1, Alta: 2, Media: 3, Baja: 4 };
  return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4)
    || (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4)
    || String(a.due_date || '').localeCompare(String(b.due_date || ''))
    || String(a.due_time || '').localeCompare(String(b.due_time || ''))
    || numberId(b.id) - numberId(a.id);
};

function decorate(state, task) {
  const category = state.categories.find((item) => item.id === task.category_id);
  const project = state.projects.find((item) => item.id === task.project_id);
  return {
    ...task,
    category: category?.name,
    category_icon: category?.icon,
    category_color: category?.color,
    project_name: project?.name,
    project_icon: project?.icon,
    project_color: project?.color,
  };
}

function save(db, state) {
  db.write(state);
}

export async function getTasks(db, filters = {}) {
  const state = db.read();
  const { date, status, search, priority, categoryId, projectId } = filters;
  return state.tasks
    .filter((task) => !date || task.due_date === date)
    .filter((task) => !status || status === 'Todas'
      || (status === 'Terminadas' ? ['Completada', 'Terminada'].includes(task.status)
        : task.status === (status === 'Pendientes' ? 'Pendiente' : status)))
    .filter((task) => !priority || priority === 'Todas' || task.priority === priority)
    .filter((task) => !categoryId || task.category_id === numberId(categoryId))
    .filter((task) => !projectId || task.project_id === numberId(projectId))
    .filter((task) => {
      if (!search?.trim()) return true;
      const value = search.trim().toLowerCase();
      return [task.title, task.description, task.notes].some((field) => field?.toLowerCase().includes(value));
    })
    .map((task) => decorate(state, task))
    .sort(sortTasks);
}

export async function getTask(db, id) {
  const state = db.read();
  const task = state.tasks.find((item) => item.id === numberId(id));
  return task ? {
    ...decorate(state, task),
    subtasks: state.subtasks.filter((item) => item.task_id === numberId(id)).sort((a, b) => a.position - b.position),
  } : null;
}

export async function createTask(db, input) {
  const state = db.read();
  const id = Math.max(0, ...state.tasks.map((item) => item.id)) + 1;
  state.tasks.push({
    id, title: input.title.trim(), description: input.description?.trim() || '',
    status: input.status || 'Pendiente', priority: input.priority || 'Media',
    category_id: input.categoryId ?? null, project_id: input.projectId ?? null,
    due_date: input.dueDate, due_time: input.dueTime || null,
    reminder_enabled: input.reminderEnabled ? 1 : 0, reminder_minutes: input.reminderMinutes ?? 30,
    recurrence: input.recurrence || 'No se repite', notes: input.notes?.trim() || '',
    created_at: now(), updated_at: now(),
  });
  (input.subtasks || []).forEach((subtask, position) => {
    if (subtask?.title?.trim()) {
      state.subtasks.push({ id: Math.max(0, ...state.subtasks.map((item) => item.id)) + 1,
        task_id: id, title: subtask.title.trim(), completed: subtask.completed ? 1 : 0, position });
    }
  });
  save(db, state);
  return id;
}

export async function updateTask(db, id, input) {
  const state = db.read();
  const task = state.tasks.find((item) => item.id === numberId(id));
  if (!task) return;
  Object.assign(task, {
    title: input.title.trim(), description: input.description?.trim() || '',
    status: input.status, priority: input.priority, category_id: input.categoryId ?? null,
    project_id: input.projectId ?? null, due_date: input.dueDate, due_time: input.dueTime || null,
    reminder_enabled: input.reminderEnabled ? 1 : 0, reminder_minutes: input.reminderMinutes ?? 30,
    recurrence: input.recurrence || 'No se repite', notes: input.notes?.trim() || '', updated_at: now(),
  });
  state.subtasks = state.subtasks.filter((item) => item.task_id !== numberId(id));
  (input.subtasks || []).forEach((subtask, position) => {
    if (subtask?.title?.trim()) state.subtasks.push({
      id: Math.max(0, ...state.subtasks.map((item) => item.id)) + 1,
      task_id: numberId(id), title: subtask.title.trim(), completed: subtask.completed ? 1 : 0, position,
    });
  });
  save(db, state);
}

export async function updateTaskStatus(db, id, status) {
  const state = db.read();
  const task = state.tasks.find((item) => item.id === numberId(id));
  if (task) { task.status = status; task.updated_at = now(); save(db, state); }
}

export async function deleteTask(db, id) {
  const state = db.read();
  state.tasks = state.tasks.filter((item) => item.id !== numberId(id));
  state.subtasks = state.subtasks.filter((item) => item.task_id !== numberId(id));
  state.notifications = state.notifications.filter((item) => item.task_id !== numberId(id));
  save(db, state);
}

export async function addSubtask(db, taskId, title, position = 0) {
  const state = db.read();
  state.subtasks.push({ id: Math.max(0, ...state.subtasks.map((item) => item.id)) + 1,
    task_id: numberId(taskId), title: title.trim(), completed: 0, position });
  save(db, state);
}

export async function toggleSubtask(db, id, completed) {
  const state = db.read();
  const item = state.subtasks.find((subtask) => subtask.id === numberId(id));
  if (item) { item.completed = completed ? 1 : 0; save(db, state); }
}

export async function deleteSubtask(db, id) {
  const state = db.read();
  state.subtasks = state.subtasks.filter((item) => item.id !== numberId(id));
  save(db, state);
}

export async function getCategories(db) {
  const state = db.read();
  return state.categories.map((category) => ({
    ...category,
    task_count: state.tasks.filter((task) => task.category_id === category.id).length,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCategory(db, { name, icon = 'folder-outline', color = '#5B4BFF' }) {
  const state = db.read();
  const id = Math.max(0, ...state.categories.map((item) => item.id)) + 1;
  state.categories.push({ id, name: name.trim(), icon, color, created_at: now() });
  save(db, state);
  return id;
}

export async function updateCategory(db, id, { name, icon, color }) {
  const state = db.read();
  const category = state.categories.find((item) => item.id === numberId(id));
  if (category) Object.assign(category, { name: name.trim(), icon, color });
  save(db, state);
}

export async function deleteCategory(db, id) {
  const state = db.read();
  state.categories = state.categories.filter((item) => item.id !== numberId(id));
  state.tasks.forEach((task) => { if (task.category_id === numberId(id)) task.category_id = null; });
  save(db, state);
}

export async function getStats(db) {
  const tasks = db.read().tasks;
  return {
    totals: {
      total: tasks.length,
      completed: tasks.filter((task) => ['Completada', 'Terminada'].includes(task.status)).length,
      pending: tasks.filter((task) => task.status === 'Pendiente').length,
      in_progress: tasks.filter((task) => task.status === 'En progreso').length,
      cancelled: tasks.filter((task) => task.status === 'Cancelada').length,
    },
    priorities: Object.entries(tasks.reduce((result, task) => {
      result[task.priority] = (result[task.priority] || 0) + 1; return result;
    }, {})).map(([priority, count]) => ({ priority, count })),
  };
}

export async function getProjectStats(db) {
  const state = db.read();
  return state.projects.map((project) => {
    const tasks = state.tasks.filter((task) => task.project_id === project.id);
    return { ...project, total_tasks: tasks.length,
      completed_tasks: tasks.filter((task) => ['Completada', 'Terminada'].includes(task.status)).length };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProjectById(db, projectId) {
  return (await getProjectStats(db)).find((project) => project.id === numberId(projectId)) || null;
}

export async function createProject(db, input) {
  const state = db.read();
  const id = Math.max(0, ...state.projects.map((item) => item.id)) + 1;
  state.projects.push({ id, name: input.name.trim(), description: input.description?.trim() || '',
    icon: input.icon || 'briefcase-outline', color: input.color || '#5B4BFF',
    start_date: input.startDate || null, due_date: input.dueDate || null,
    status: input.status || 'Activo', created_at: now(), updated_at: now() });
  save(db, state);
  return id;
}

export async function updateProject(db, id, input) {
  const state = db.read();
  const project = state.projects.find((item) => item.id === numberId(id));
  if (project) Object.assign(project, { name: input.name.trim(), description: input.description?.trim() || '',
    icon: input.icon, color: input.color, start_date: input.startDate || null,
    due_date: input.dueDate || null, status: input.status || 'Activo', updated_at: now() });
  save(db, state);
}

export async function deleteProject(db, id) {
  const state = db.read();
  state.projects = state.projects.filter((item) => item.id !== numberId(id));
  state.tasks.forEach((task) => { if (task.project_id === numberId(id)) task.project_id = null; });
  save(db, state);
}

export async function assignTasksToProject(db, projectId, taskIds) {
  const state = db.read();
  state.tasks.forEach((task) => { if (taskIds.map(Number).includes(task.id)) task.project_id = numberId(projectId); });
  save(db, state);
}

export async function getDatesWithTasks(db, startKey, endKey) {
  return new Set(db.read().tasks.filter((task) => task.due_date >= startKey && task.due_date <= endKey)
    .map((task) => task.due_date));
}

export function toTaskCard(row) {
  return { ...row, color: row.category_color || '#5B4BFF', time: row.due_time || 'Sin hora' };
}
