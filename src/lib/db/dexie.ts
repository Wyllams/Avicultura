import Dexie, { type Table } from 'dexie';

// ----------------------------------------------------------------------------
// Interfaces (Modelos Locais Offline)
// ----------------------------------------------------------------------------

export interface OfflineMortalityLog {
  id?: number;          // PK Local Auto-incrementado do IndexedDB
  syncId: string;       // UUID gerado localmente, enviado pro backend p/ idempotência
  flockId: string;      // ID do Lote
  date: string;         // ISO Date da morte
  quantity: number;
  cause?: string;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: string;
}

export interface OfflineWeightLog {
  id?: number;
  syncId: string;
  flockId: string;
  date: string;
  ageInDays: number;
  averageWeight: number;
  sampleSize?: number;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: string;
}

export interface OfflineFeedLog {
  id?: number;
  syncId: string;
  flockId: string;
  date: string;
  feedType: string;
  quantityKg: number;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: string;
}

export interface OfflineVaccineLog {
  id?: number;
  syncId: string;
  flockId: string;
  date: string;
  vaccineName: string;
  method: string;
  appliedBy?: string;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: string;
}

export interface OfflineStockMovement {
  id?: number;
  syncId: string;
  itemId: string;
  farmId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason?: string;
  date: string;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: string;
}

export interface OfflineVisitLog {
  id?: number;
  syncId: string;
  flockId: string;
  date: string;
  veterinarian: string;
  report: string;
  pdfBlob?: Blob; // Para PDF offline (Base64/File)
  pdfName?: string;
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: string;
}

export interface OfflineTask {
  id?: number;
  syncId: string;
  action: 'CREATE' | 'UPDATE_STATUS' | 'DELETE';
  taskId?: string;     // UUID for UPDATE/DELETE, or the local generated UUID for CREATE
  payload?: any;       // Task data for CREATE, or { status, evidenceUrls } for UPDATE
  syncStatus: 'pending' | 'synced' | 'error';
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Instância do Dexie (AgroSaaS Database Offline)
// ----------------------------------------------------------------------------
export class AgroSaasDexie extends Dexie {
  // Filas de sincronização
  mortality_queue!: Table<OfflineMortalityLog, number>;
  weighing_queue!: Table<OfflineWeightLog, number>;
  feed_queue!: Table<OfflineFeedLog, number>;
  vaccine_queue!: Table<OfflineVaccineLog, number>;
  stock_movements_queue!: Table<OfflineStockMovement, number>;
  visits_queue!: Table<OfflineVisitLog, number>;
  tasks_queue!: Table<OfflineTask, number>;

  constructor() {
    super('AgroSaasDB');
    
    // v1 do schema local
    this.version(1).stores({
      mortality_queue: '++id, syncId, flockId, syncStatus',
      weighing_queue: '++id, syncId, flockId, syncStatus',
      feed_queue: '++id, syncId, flockId, syncStatus',
      vaccine_queue: '++id, syncId, flockId, syncStatus'
    });

    // v2 do schema local (Adição do módulo de estoque offline)
    this.version(2).stores({
      mortality_queue: '++id, syncId, flockId, syncStatus',
      weighing_queue: '++id, syncId, flockId, syncStatus',
      feed_queue: '++id, syncId, flockId, syncStatus',
      vaccine_queue: '++id, syncId, flockId, syncStatus',
      stock_movements_queue: '++id, syncId, itemId, farmId, syncStatus'
    });

    // v3 do schema local (Visitas com PDF Offline + Tarefas Offline)
    this.version(3).stores({
      mortality_queue: '++id, syncId, flockId, syncStatus',
      weighing_queue: '++id, syncId, flockId, syncStatus',
      feed_queue: '++id, syncId, flockId, syncStatus',
      vaccine_queue: '++id, syncId, flockId, syncStatus',
      stock_movements_queue: '++id, syncId, itemId, farmId, syncStatus',
      visits_queue: '++id, syncId, flockId, syncStatus',
      tasks_queue: '++id, syncId, taskId, syncStatus'
    });
  }
}

export const db = new AgroSaasDexie();
