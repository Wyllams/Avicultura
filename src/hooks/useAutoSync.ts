import { useEffect } from 'react';
import { db } from '@/lib/db/dexie';
import { useNetworkStatus } from './useNetworkStatus';
import { syncMortalityRecords } from '@/app/actions/mortalidade';
import { syncFeedRecords } from '@/app/actions/racao';
import { syncWeightRecords } from '@/app/actions/pesagens';
import { toast } from 'sonner';

export function useAutoSync() {
  const isOnline = useNetworkStatus();

  useEffect(() => {
    let isProcessing = false;

    const processSyncQueue = async () => {
      if (!isOnline || isProcessing) return;
      isProcessing = true;

      try {
        let syncedCount = 0;

        // 1. Sync Mortality
        const pendingMortality = await db.mortality_queue
          .where('syncStatus')
          .equals('pending')
          .toArray();

        if (pendingMortality.length > 0) {
          const res = await syncMortalityRecords(pendingMortality);
          if (res.success && res.syncedIds) {
             for (const id of res.syncedIds) {
               await db.mortality_queue.where('syncId').equals(id).modify({ syncStatus: 'synced' });
             }
             syncedCount += pendingMortality.length;
          }
        }

        // 2. Sync Feed (Ração)
        const pendingFeed = await db.feed_queue
          .where('syncStatus')
          .equals('pending')
          .toArray();

        if (pendingFeed.length > 0) {
          const resFeed = await syncFeedRecords(pendingFeed);
          if (resFeed.success) {
            await Promise.all(
              // Assuming for Feed it was using id primary key directly in update map
              pendingFeed.map(record => db.feed_queue.update(record.id!, { syncStatus: 'synced' }))
            );
            syncedCount += pendingFeed.length;
          }
        }

        // 3. Sync Weights (Pesagens)
        const pendingWeights = await db.weighing_queue
          .where('syncStatus')
          .equals('pending')
          .toArray();

        if (pendingWeights.length > 0) {
          const resWeight = await syncWeightRecords(pendingWeights);
          if (resWeight.success && resWeight.syncedIds) {
             for (const id of resWeight.syncedIds) {
               await db.weighing_queue.where('syncId').equals(id).modify({ syncStatus: 'synced' });
             }
             syncedCount += pendingWeights.length;
          }
        }

        // 4. Sync Stock Movements (Estoque)
        const { syncStockMovements } = await import('@/app/actions/estoque');
        const pendingStock = await db.stock_movements_queue
          .where('syncStatus')
          .equals('pending')
          .toArray();

        if (pendingStock.length > 0) {
          const resStock = await syncStockMovements(pendingStock);
          if (resStock.success && resStock.syncedIds) {
             for (const id of resStock.syncedIds) {
               await db.stock_movements_queue.where('syncId').equals(id).modify({ syncStatus: 'synced' });
             }
             syncedCount += pendingStock.length;
          }
        }

        // 5. Sync Vaccinations
        const { syncVaccinations, syncVisits } = await import('@/app/actions/sanidade');
        const pendingVaccines = await db.vaccine_queue
          .where('syncStatus')
          .equals('pending')
          .toArray();

        if (pendingVaccines.length > 0) {
          const resVac = await syncVaccinations(pendingVaccines);
          if (resVac.success && resVac.syncedIds) {
             for (const id of resVac.syncedIds) {
               await db.vaccine_queue.where('syncId').equals(id).modify({ syncStatus: 'synced' });
             }
             syncedCount += pendingVaccines.length;
          }
        }

        // 6. Sync Visits (with PDFs Base64 offline)
        const pendingVisits = await db.visits_queue
          .where('syncStatus')
          .equals('pending')
          .toArray();

        if (pendingVisits.length > 0) {
          const resVisits = await syncVisits(pendingVisits);
          if (resVisits.success && resVisits.syncedIds) {
             for (const id of resVisits.syncedIds) {
               await db.visits_queue.where('syncId').equals(id).modify({ syncStatus: 'synced' });
             }
             syncedCount += pendingVisits.length;
          }
        }

        // 7. Sync Tasks
        const { syncTasks } = await import('@/app/actions/tarefas');
        const pendingTasks = await db.tasks_queue
          .where('syncStatus')
          .equals('pending')
          .toArray();

        // Need to process tasks in order, ascending by createdAt to avoid issues if we update status before creating
        if (pendingTasks.length > 0) {
          const sortedTasks = pendingTasks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          const resTasks = await syncTasks(sortedTasks);
          if (resTasks.success && resTasks.syncedIds) {
             for (const id of resTasks.syncedIds) {
               await db.tasks_queue.where('syncId').equals(id).modify({ syncStatus: 'synced' });
             }
             syncedCount += pendingTasks.length;
          }
        }

        if (syncedCount > 0) {
          toast.success(`Sincronização global: ${syncedCount} registros salvos na nuvem.`);
        }

      } catch (error) {
        console.error('Erro na sincronização em background:', error);
      } finally {
        isProcessing = false;
      }
    };

    // Attempt to sync immediately when coming online
    if (isOnline) {
      processSyncQueue();
    }

    // Attempt to sync every 2 minutes as a fallback
    const interval = setInterval(processSyncQueue, 120000);

    return () => clearInterval(interval);
  }, [isOnline]);

  return { isOnline };
}
