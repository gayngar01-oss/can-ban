import React from 'react';
import { CRMTask, TaskStatus } from '../types/crm.ts';
import { KanbanColumn } from './KanbanColumn.tsx';

interface KanbanBoardProps {
  tasks: CRMTask[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: CRMTask) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

const COLUMNS: TaskStatus[] = ['Não iniciado', 'Em Andamento', 'Finalizado'];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onStatusChange,
}) => {
  const handleDropTask = (taskId: string, targetStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== targetStatus) {
      onStatusChange(taskId, targetStatus);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {COLUMNS.map((columnStatus) => {
        const columnTasks = tasks.filter((t) => t.status === columnStatus);
        return (
          <KanbanColumn
            key={columnStatus}
            status={columnStatus}
            tasks={columnTasks}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onStatusChange={onStatusChange}
            onDropTask={handleDropTask}
          />
        );
      })}
    </div>
  );
};
