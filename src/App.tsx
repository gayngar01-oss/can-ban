/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CRMTask, TaskStatus } from './types/crm.ts';
import {
  apiFetchTasks,
  apiCreateTask,
  apiUpdateTask,
  apiUpdateTaskStatus,
  apiDeleteTask,
  getStoredSupabaseConfig,
  getSupabaseClient,
} from './lib/supabase.ts';
import { Header } from './components/Header.tsx';
import { StatsBar } from './components/StatsBar.tsx';
import { KanbanBoard } from './components/KanbanBoard.tsx';
import { TaskModal } from './components/TaskModal.tsx';
import { SupabaseModal } from './components/SupabaseModal.tsx';
import { Plus, Database, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [taskToEdit, setTaskToEdit] = useState<CRMTask | null>(null);
  const [defaultStatusForNew, setDefaultStatusForNew] = useState<TaskStatus>('Não iniciado');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

  // Connection State
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Load tasks on mount or config change
  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetchTasks();
      setTasks(data);
    } catch (err) {
      console.error('Falha ao carregar tarefas:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkSupabaseStatus = useCallback(() => {
    const config = getStoredSupabaseConfig();
    setIsSupabaseConfigured(Boolean(config.url && config.anonKey));
  }, []);

  useEffect(() => {
    checkSupabaseStatus();
    loadTasks();
  }, [checkSupabaseStatus, loadTasks]);

  // Setup Supabase realtime subscription if client is available
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const channel = client
        .channel('public:tasks')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newTask = payload.new as CRMTask;
              setTasks((prev) => {
                if (prev.some((t) => t.id === newTask.id)) return prev;
                return [newTask, ...prev];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedTask = payload.new as CRMTask;
              setTasks((prev) =>
                prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as { id: string }).id;
              setTasks((prev) => prev.filter((t) => t.id !== deletedId));
            }
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } catch (err) {
      console.error('Erro na subscrição em tempo real:', err);
    }
  }, [isSupabaseConfigured]);

  // Task actions
  const handleOpenNewTask = (status: TaskStatus = 'Não iniciado') => {
    setTaskToEdit(null);
    setDefaultStatusForNew(status);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: CRMTask) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (task: CRMTask) => {
    const isEdit = Boolean(taskToEdit);
    try {
      if (isEdit) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
        await apiUpdateTask(task);
        showToast('Tarefa atualizada com sucesso!', 'success');
      } else {
        setTasks((prev) => [task, ...prev]);
        await apiCreateTask(task);
        showToast('Tarefa criada com sucesso!', 'success');
      }
    } catch (err) {
      console.error('Erro ao salvar tarefa:', err);
      showToast('Tarefa salva localmente (verifique a conexão com o Supabase).', 'info');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, updated_at: new Date().toISOString() }
          : t
      )
    );

    try {
      await apiUpdateTaskStatus(taskId, newStatus);
      showToast(`Status alterado para "${newStatus}"`, 'info');
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await apiDeleteTask(taskId);
      showToast('Tarefa excluída.', 'info');
    } catch (err) {
      console.error('Erro ao excluir tarefa:', err);
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(term);
        const matchesClient = task.client_name?.toLowerCase().includes(term);
        const matchesDesc = task.description?.toLowerCase().includes(term);
        const matchesTags = task.tags?.some((t) => t.toLowerCase().includes(term));
        if (!matchesTitle && !matchesClient && !matchesDesc && !matchesTags) {
          return false;
        }
      }

      // Priority filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchTerm, priorityFilter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Header */}
      <Header
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={setPriorityFilter}
        onOpenNewTaskModal={() => handleOpenNewTask('Não iniciado')}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        isSupabaseConfigured={isSupabaseConfigured}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Stats */}
        <StatsBar tasks={tasks} />

        {/* Supabase Notice Banner if not configured yet */}
        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Pronto para conectar ao Supabase
                </p>
                <p className="text-xs text-amber-700">
                  Você já pode criar e movimentar tarefas manualmente no Kanban. Para salvar na nuvem em tempo real, conecte suas chaves do Supabase.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="text-xs font-semibold px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shrink-0 shadow-2xs"
            >
              Conectar Supabase
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Carregando tarefas do CRM...</p>
          </div>
        ) : tasks.length === 0 ? (
          /* Empty state - absolutely NO mock data */
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-xl mx-auto my-6 shadow-xs flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Plus className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Quadro Kanban pronto para uso!
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Nenhuma tarefa modelo foi criada. Crie suas tarefas manualmente para organizar seus clientes, atendimentos e negociações nas colunas <strong>Não iniciado</strong>, <strong>Em Andamento</strong> e <strong>Finalizado</strong>.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleOpenNewTask('Não iniciado')}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Criar Primeira Tarefa</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSupabaseModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors border border-slate-200"
              >
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Configurar Supabase</span>
              </button>
            </div>
          </div>
        ) : (
          /* Kanban Board */
          <KanbanBoard
            tasks={filteredTasks}
            onAddTask={handleOpenNewTask}
            onEditTask={handleOpenEditTask}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        taskToEdit={taskToEdit}
        defaultStatus={defaultStatusForNew}
      />

      {/* Supabase Connection Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigUpdated={() => {
          checkSupabaseStatus();
          loadTasks();
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg bg-slate-900 text-white text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
