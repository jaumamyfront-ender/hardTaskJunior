// import { IExecutor } from "./Executor";
// import ITask from "./Task";

// export default async function run(
//   executor: IExecutor,
//   queue: AsyncIterable<ITask>,
//   maxThreads = 0
// ) {
//   const runningTasks = new Map<number, Promise<void>>();
//   let activeThreads = 0;
//   let isQueueFinished = false;

//   const queueReader = (async () => {
//     for await (const task of queue) {
//       await scheduleTask(task);
//     }
//     isQueueFinished = true;
//   })();

//   async function scheduleTask(task: ITask) {
//     const { targetId } = task;

//     while (maxThreads > 0 && activeThreads >= maxThreads) {
//       await Promise.race(runningTasks.values()); // Czekamy tylko na jedno zadanie
//     }

//     if (runningTasks.has(targetId)) {
//       await runningTasks.get(targetId);
//     }

//     activeThreads++;
//     const taskPromise = executor.executeTask(task).finally(() => {
//       runningTasks.delete(targetId);
//       activeThreads--;
//     });

//     runningTasks.set(targetId, taskPromise);
//   }

//   await queueReader;

//   while (runningTasks.size > 0) {
//     await Promise.race(runningTasks.values());
//   }
// }
// // import { IExecutor } from "./Executor";
// import ITask from "./Task";
// import { IExecutor } from "./Executor";

// export default async function run(
//   executor: IExecutor,
//   queue: AsyncIterable<ITask>,
//   maxThreads = 0
// ) {
//   const runningTasks = new Map<number, Promise<void>>();
//   let activeThreads = 0;
//   let isQueueFinished = false;

//   // Буферизуем очередь и сортируем
//   const bufferedQueue: ITask[] = [];
//   for await (const task of queue) {
//     bufferedQueue.push(task);
//   }

//   // Задаём порядок действий
//   const actionOrder: Record<string, number> = {
//     init: 0,
//     prepare: 1,
//     work: 2,
//     finalize: 3,
//     cleanup: 4,
//   };

//   // Сортировка
//   bufferedQueue.sort((a, b) => {
//     const actionDiff = actionOrder[a.action] - actionOrder[b.action];
//     if (actionDiff !== 0) return actionDiff;
//     return a.targetId - b.targetId;
//   });

//   // Превращаем отсортированный массив обратно в AsyncIterable
//   async function* sortedQueueGenerator() {
//     for (const task of bufferedQueue) {
//       yield task;
//     }
//   }

//   const queueReader = (async () => {
//     for await (const task of sortedQueueGenerator()) {
//       await scheduleTask(task);
//     }
//     isQueueFinished = true;
//   })();

//   async function scheduleTask(task: ITask) {
//     const { targetId } = task;

//     while (maxThreads > 0 && activeThreads >= maxThreads) {
//       await Promise.race(runningTasks.values()); // Ждём, пока освободится поток
//     }

//     if (runningTasks.has(targetId)) {
//       await runningTasks.get(targetId);
//     }

//     activeThreads++;
//     const taskPromise = executor.executeTask(task).finally(() => {
//       runningTasks.delete(targetId);
//       activeThreads--;
//     });

//     runningTasks.set(targetId, taskPromise);
//   }

//   await queueReader;

//   while (runningTasks.size > 0) {
//     await Promise.race(runningTasks.values());
//   }
// }
