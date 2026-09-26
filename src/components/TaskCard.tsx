import React from 'react';
import { CRMTask, TaskStatus } from '../types/crm.ts';
import {
  Calendar,
  DollarSign,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Trash2,
  Phone,
  Mail,
} from 'lucide-react';

interface TaskCardProps {
  task: CRMTask;
  onEdit: (task: CRMTask) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgente':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Alta':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Média':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Baixa':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatCurrency = (val?: number) => {
    if (!val || val === 0) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onEdit(task)}
      className="group relative bg-white border border-slate-200/90 hover:border-slate-300 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all duration-150 cursor-grab active:cursor-grabbing flex flex-col gap-3"
    >
      {/* Top row: Priority & Quick Actions */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityStyle(
            task.priority
          )}`}
        >
          {task.priority}
        </span>

        {/* Action buttons (stop propagation so it doesn't open the modal) */}
        <div
          className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {task.status === 'Não iniciado' && (
            <button
              type="button"
              title="Iniciar tarefa"
              onClick={() => onStatusChange(task.id, 'Em Andamento')}
              className="flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-2 py-1 rounded-md transition-colors"
            >
              <span>Iniciar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {task.status === 'Em Andamento' && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Mover de volta para Não iniciado"
                onClick={() => onStatusChange(task.id, 'Não iniciado')}
                className="text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 p-1 rounded-md transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                title="Finalizar tarefa"
                onClick={() => onStatusChange(task.id, 'Finalizado')}
                className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2 py-1 rounded-md transition-colors"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Finalizar</span>
              </button>
            </div>
          )}

          {task.status === 'Finalizado' && (
            <button
              type="button"
              title="Reabrir para Em Andamento"
              onClick={() => onStatusChange(task.id, 'Em Andamento')}
              className="text-[11px] font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md transition-colors"
            >
              Reabrir
            </button>
          )}

          <button
            type="button"
            title="Excluir tarefa"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Deseja realmente excluir a tarefa "${task.title}"?`)) {
                onDelete(task.id);
              }
            }}
            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-colors ml-0.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task Title */}
      <div>
        <h4 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">
          {task.title}
        </h4>
        {task.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}
      </div>

      {/* Tags if present */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* CRM Details (Client, Deal Value, Due Date) */}
      <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5 text-xs text-slate-600">
        {task.client_name && (
          <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{task.client_name}</span>
          </div>
        )}

        {(task.client_email || task.client_phone) && (
          <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
            {task.client_email && (
              <span className="flex items-center gap-1 truncate" title={task.client_email}>
                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{task.client_email}</span>
              </span>
            )}
            {task.client_phone && (
              <span className="flex items-center gap-1 shrink-0" title={task.client_phone}>
                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{task.client_phone}</span>
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-0.5 pt-1">
          {task.deal_value ? (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              <DollarSign className="w-3 h-3 shrink-0" />
              {formatCurrency(task.deal_value)}
            </span>
          ) : (
            <span />
          )}

          {task.due_date && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
              {task.due_date}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
