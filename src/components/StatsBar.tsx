import React from 'react';
import { CRMTask } from '../types/crm.ts';
import { CheckCircle2, Clock, DollarSign, Layers } from 'lucide-react';

interface StatsBarProps {
  tasks: CRMTask[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ tasks }) => {
  const total = tasks.length;
  const naoIniciado = tasks.filter((t) => t.status === 'Não iniciado').length;
  const emAndamento = tasks.filter((t) => t.status === 'Em Andamento').length;
  const finalizado = tasks.filter((t) => t.status === 'Finalizado').length;

  const totalValue = tasks.reduce((acc, t) => acc + (Number(t.deal_value) || 0), 0);
  const completionRate = total > 0 ? Math.round((finalizado / total) * 100) : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Total de Tarefas */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 truncate">Total de Tarefas</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-slate-900">{total}</span>
            <span className="text-xs text-slate-400">
              ({naoIniciado} pendentes)
            </span>
          </div>
        </div>
      </div>

      {/* Em Andamento */}
      <div className="bg-white rounded-xl border border-amber-200/80 p-3.5 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
          <Clock className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-amber-700 truncate">Em Andamento</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-amber-900">{emAndamento}</span>
            <span className="text-xs text-amber-600">em execução</span>
          </div>
        </div>
      </div>

      {/* Finalizadas */}
      <div className="bg-white rounded-xl border border-emerald-200/80 p-3.5 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-emerald-700 truncate">Finalizadas</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-emerald-900">{finalizado}</span>
            <span className="text-xs text-emerald-600">({completionRate}% concluído)</span>
          </div>
        </div>
      </div>

      {/* Pipeline / Valor em Negociação */}
      <div className="bg-white rounded-xl border border-blue-200/80 p-3.5 shadow-xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
          <DollarSign className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-blue-700 truncate">Valor em Pipeline</p>
          <span className="text-lg font-bold text-blue-900 truncate block">
            {formatCurrency(totalValue)}
          </span>
        </div>
      </div>
    </div>
  );
};
