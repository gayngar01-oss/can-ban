import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CRMTask, SupabaseConfig, TaskStatus } from '../types/crm.ts';

const STORAGE_KEY_CONFIG = 'crm_supabase_config';
const STORAGE_KEY_TASKS = 'crm_local_tasks';

// SQL statement for user to run in Supabase SQL Editor
export const SUPABASE_SQL_SCHEMA = `-- Script para criar a tabela de tarefas do CRM no Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  description text default '',
  status text not null check (status in ('Não iniciado', 'Em Andamento', 'Finalizado')),
  priority text default 'Média' check (priority in ('Baixa', 'Média', 'Alta', 'Urgente')),
  client_name text default '',
  client_email text default '',
  client_phone text default '',
  deal_value numeric default 0,
  due_date text,
  tags text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar Row Level Security (RLS)
alter table public.tasks enable row level security;

-- Política para permitir leitura e escrita pública com a anon key
drop policy if exists "Permitir todas operações em tasks" on public.tasks;
create policy "Permitir todas operações em tasks" on public.tasks
  for all
  using (true)
  with check (true);

-- Habilitar publicações de tempo real (opcional)
alter publication supabase_realtime add table public.tasks;
`;

export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (envUrl && envKey && !envUrl.includes('your-project') && !envKey.includes('your-anon')) {
    return { url: envUrl, anonKey: envKey };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Erro ao ler configuração do Supabase:', err);
  }

  return { url: '', anonKey: '' };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  try {
    if (!config.url || !config.anonKey) {
      localStorage.removeItem(STORAGE_KEY_CONFIG);
    } else {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    }
  } catch (err) {
    console.error('Erro ao salvar configuração do Supabase:', err);
  }
}

let cachedClient: SupabaseClient | null = null;
let currentClientConfigHash = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    cachedClient = null;
    currentClientConfigHash = '';
    return null;
  }

  const hash = `${config.url}_${config.anonKey}`;
  if (cachedClient && currentClientConfigHash === hash) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
      },
    });
    currentClientConfigHash = hash;
    return cachedClient;
  } catch (err) {
    console.error('Erro ao instanciar cliente Supabase:', err);
    return null;
  }
}

export async function testSupabaseConnection(config?: SupabaseConfig): Promise<{
  success: boolean;
  message: string;
  tableExists?: boolean;
}> {
  const targetConfig = config || getStoredSupabaseConfig();
  if (!targetConfig.url || !targetConfig.anonKey) {
    return {
      success: false,
      message: 'URL e Anon Key do Supabase não fornecidas.',
    };
  }

  try {
    const client = createClient(targetConfig.url, targetConfig.anonKey, {
      auth: { persistSession: false },
    });

    // Try reading 1 task from public.tasks table
    const { data: _data, error } = await client.from('tasks').select('id').limit(1);

    if (error) {
      // Check if table does not exist
      if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('tasks')) {
        return {
          success: true,
          tableExists: false,
          message: 'Conectado ao Supabase! Porém a tabela "tasks" ainda não existe. Execute o script SQL no editor do Supabase.',
        };
      }
      return {
        success: false,
        message: `Falha na consulta: ${error.message}`,
      };
    }

    return {
      success: true,
      tableExists: true,
      message: 'Conexão com o Supabase estabelecida e tabela "tasks" pronta!',
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Erro de conexão: ${errMsg}`,
    };
  }
}

// LocalStorage helpers for fallback / initial mode
export function getLocalTasks(): CRMTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler tarefas locais:', err);
    return [];
  }
}

export function saveLocalTasks(tasks: CRMTask[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  } catch (err) {
    console.error('Erro ao salvar tarefas locais:', err);
  }
}

// Unified API for CRM operations
export async function apiFetchTasks(): Promise<CRMTask[]> {
  const client = getSupabaseClient();
  if (!client) {
    return getLocalTasks();
  }

  try {
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Erro ao carregar do Supabase, usando tarefas locais:', error.message);
      return getLocalTasks();
    }

    // Keep local storage in sync as a backup
    if (data) {
      saveLocalTasks(data as CRMTask[]);
      return data as CRMTask[];
    }
    return [];
  } catch (err) {
    console.error('Exceção ao buscar tarefas:', err);
    return getLocalTasks();
  }
}

export async function apiCreateTask(task: CRMTask): Promise<CRMTask> {
  const client = getSupabaseClient();
  
  // Always update local cache
  const current = getLocalTasks();
  const updated = [task, ...current.filter((t) => t.id !== task.id)];
  saveLocalTasks(updated);

  if (!client) {
    return task;
  }

  try {
    const { data, error } = await client.from('tasks').insert([task]).select().single();
    if (error) {
      console.error('Erro ao inserir tarefa no Supabase:', error.message);
      throw error;
    }
    return data as CRMTask;
  } catch (err) {
    console.error('Falha ao salvar no Supabase:', err);
    return task;
  }
}

export async function apiUpdateTask(task: CRMTask): Promise<CRMTask> {
  const client = getSupabaseClient();

  const current = getLocalTasks();
  const updated = current.map((t) => (t.id === task.id ? task : t));
  saveLocalTasks(updated);

  if (!client) {
    return task;
  }

  try {
    const { data, error } = await client
      .from('tasks')
      .update({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        client_name: task.client_name || '',
        client_email: task.client_email || '',
        client_phone: task.client_phone || '',
        deal_value: task.deal_value || 0,
        due_date: task.due_date || null,
        tags: task.tags || [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar tarefa no Supabase:', error.message);
      throw error;
    }
    return (data as CRMTask) || task;
  } catch (err) {
    console.error('Falha ao atualizar no Supabase:', err);
    return task;
  }
}

export async function apiUpdateTaskStatus(taskId: string, newStatus: TaskStatus): Promise<void> {
  const current = getLocalTasks();
  const task = current.find((t) => t.id === taskId);
  if (task) {
    task.status = newStatus;
    task.updated_at = new Date().toISOString();
    saveLocalTasks(current);
  }

  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client
      .from('tasks')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) {
      console.error('Erro ao atualizar status no Supabase:', error.message);
    }
  } catch (err) {
    console.error('Falha ao atualizar status no Supabase:', err);
  }
}

export async function apiDeleteTask(taskId: string): Promise<void> {
  const current = getLocalTasks();
  const filtered = current.filter((t) => t.id !== taskId);
  saveLocalTasks(filtered);

  const client = getSupabaseClient();
  if (!client) return;

  try {
    const { error } = await client.from('tasks').delete().eq('id', taskId);
    if (error) {
      console.error('Erro ao deletar tarefa do Supabase:', error.message);
    }
  } catch (err) {
    console.error('Falha ao deletar do Supabase:', err);
  }
}
