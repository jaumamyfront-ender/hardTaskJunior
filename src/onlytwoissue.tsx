import { IExecutor } from "./Executor";
import ITask from "./Task";
import ITaskExt from "../test/ITaskExt";

export default async function run(
  executor: IExecutor,
  queue:
    | AsyncIterable<ITask>
    | { q: ITaskExt[]; [Symbol.asyncIterator](): AsyncIterator<ITask> },
  maxThreads = 0
) {
  const runningTasks = new Map<number, Promise<void>>();
  const lastScheduledByTargetId = new Map<number, Promise<void>>();
  let activeThreads = 0;
  let isQueueFinished = false;

  function isModifyingQueue(q: any): q is { q: ITaskExt[] } {
    return Array.isArray(q.q);
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
          lastScheduledByTargetId.delete(task.targetId);
        }
      }
    });

    runningTasks.set(task.targetId, current);
    lastScheduledByTargetId.set(task.targetId, current);
  }

  // 🧠 TYLKO jedna funkcja obsługująca oba typy kolejek
  async function taskFeeder() {
    if (isModifyingQueue(queue)) {
      // Dynamicznie modyfikowana kolejka
      while (true) {
        const nextTask = queue.q.find((t) => !t.acquired && !t.completed);

        if (!nextTask) {
          if (activeThreads === 0 && runningTasks.size === 0) {
            isQueueFinished = true;
            break;
          }
          await sleep(10);
          continue;
        }

        nextTask.acquired = true;
        scheduleTask(nextTask);
      }
    }

    // Niezależnie od tego czy `q` jest czy nie — czytaj też z async iterable
    for await (const task of queue as AsyncIterable<ITask>) {
      scheduleTask(task);
    }

    isQueueFinished = true;
  }

  await taskFeeder();

  while (runningTasks.size > 0 || !isQueueFinished) {
    await Promise.all([...runningTasks.values()]);
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
