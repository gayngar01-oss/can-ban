import React, { useState } from 'react';
import { CRMTask, TaskStatus } from '../types/crm.ts';
import { TaskCard } from './TaskCard.tsx';
import { Plus, CircleDot, Clock, CheckCircle } from 'lucide-react';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: CRMTask[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: CRMTask) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDropTask: (taskId: string, targetStatus: TaskStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onDropTask,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const getColumnTheme = () => {
    switch (status) {
      case 'Não iniciado':
        return {
          icon: <CircleDot className="w-4 h-4 text-slate-500" />,
          accent: 'border-t-slate-500',
          badge: 'bg-slate-100 text-slate-700',
          headerBg: 'bg-slate-50/80',
          emptyText: 'Nenhuma tarefa pendente',
        };
      case 'Em Andamento':
        return {
          icon: <Clock className="w-4 h-4 text-amber-500" />,
          accent: 'border-t-amber-500',
          badge: 'bg-amber-100 text-amber-800',
          headerBg: 'bg-amber-50/50',
          emptyText: 'Nenhuma tarefa em andamento',
        };
      case 'Finalizado':
        return {
          icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
          accent: 'border-t-emerald-500',
          badge: 'bg-emerald-100 text-emerald-800',
          headerBg: 'bg-emerald-50/50',
          emptyText: 'Nenhuma tarefa finalizada ainda',
        };
    }
  };

  const theme = getColumnTheme();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDropTask(taskId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col bg-slate-100/70 border border-slate-200/90 rounded-2xl overflow-hidden transition-all duration-150 min-h-[520px] ${
        isDragOver ? 'ring-2 ring-blue-500 bg-blue-50/30' : ''
      }`}
    >
      {/* Column Header */}
      <div
        className={`p-3.5 border-b border-slate-200/80 border-t-4 ${theme.accent} ${theme.headerBg} flex items-center justify-between gap-2`}
      >
        <div className="flex items-center gap-2">
          {theme.icon}
          <h3 className="font-semibold text-slate-800 text-sm tracking-tight">
            {status}
          </h3>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${theme.badge}`}
          >
            {tasks.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onAddTask(status)}
          title={`Adicionar tarefa em ${status}`}
          className="text-slate-500 hover:text-slate-800 hover:bg-white p-1 rounded-lg border border-transparent hover:border-slate-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Task list container */}
      <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 rounded-xl my-2 bg-white/40">
            <p className="text-xs text-slate-400 font-medium">{theme.emptyText}</p>
            <button
              type="button"
              onClick={() => onAddTask(status)}
              className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200/60 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar tarefa</span>
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
};
