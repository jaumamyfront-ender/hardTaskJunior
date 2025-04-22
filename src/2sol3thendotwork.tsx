import { IExecutor } from "./Executor";
import ITask from "./Task";
import ITaskExt from "../test/ITaskExt"; // <-- popraw ścieżkę, jeśli inna

export default async function run(
  executor: IExecutor,
  queue: { q: ITaskExt[] },
  maxThreads = 0
) {
  const runningTasks = new Map<number, Promise<void>>();
  const lastScheduledByTargetId = new Map<number, Promise<void>>();
  let activeThreads = 0;

  // Sprawdź stale, czy pojawiły się nowe zadania do przetworzenia
  async function taskFeeder() {
    while (true) {
      const nextTask = queue.q.find(
        (t) => !(t as any).acquired && !(t as any).completed
      );

      if (!nextTask) {
        // nie ma nowych zadań do zaplanowania
        if (activeThreads === 0 && runningTasks.size === 0) break;
        await sleep(10); // odczekaj i sprawdź jeszcze raz
        continue;
      }

      nextTask.acquired = true;
      scheduleTask(nextTask);
    }
  }

  function scheduleTask(task: ITask) {
    const prev =
      lastScheduledByTargetId.get(task.targetId) || Promise.resolve();

    const current = prev.then(async () => {
      while (maxThreads > 0 && activeThreads >= maxThreads) {
        await Promise.race(runningTasks.values());
      }

      activeThreads++;
      try {
        await executor.executeTask(task);
      } finally {
        activeThreads--;
        if (lastScheduledByTargetId.get(task.targetId) === current) {
          runningTasks.delete(task.targetId);
        }
      }
    });

    runningTasks.set(task.targetId, current);
    lastScheduledByTargetId.set(task.targetId, current);
  }

  await taskFeeder();

  // Czekaj aż wszystko się zakończy
  await Promise.all([...runningTasks.values()]);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
