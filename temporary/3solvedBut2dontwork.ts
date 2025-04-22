import { IExecutor } from "./Executor";
import ITask from "./Task";

export default async function run(
  executor: IExecutor,
  queue: AsyncIterable<ITask>,
  maxThreads = 0
) {
  const runningTasks = new Map<number, Promise<void>>();
  let activeThreads = 0;
  let isQueueFinished = false;
  const lastScheduledByTargetId = new Map<number, Promise<void>>();
  console.log("maxThreads", maxThreads);

  const queueReader = (async () => {
    for await (const task of queue) {
      await scheduleTask(task);
    }
    isQueueFinished = true;
  })();

  async function scheduleTask(task: ITask) {
    while (maxThreads > 0 && activeThreads >= maxThreads) {
      await Promise.race(runningTasks.values());
    }

    const prev =
      lastScheduledByTargetId.get(task.targetId) || Promise.resolve();

    const current = prev.then(async () => {
      activeThreads++;
      try {
        await executor.executeTask(task);
      } catch (err) {
        console.error(`Task ${prev} failed`, err);
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
  await queueReader;

  while (runningTasks.size > 0 || !isQueueFinished) {
    await Promise.all(runningTasks.values());
  }
}
