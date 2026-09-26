export type TaskStatus = 'Não iniciado' | 'Em Andamento' | 'Finalizado';

export type TaskPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export interface CRMTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  deal_value?: number;
  due_date?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
