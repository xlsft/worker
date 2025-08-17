import { defineTask, emit, TaskEvent } from "./lib/defineTask.ts";
import { useTasks } from "./lib/useTasks.ts";
import { defineCoroutine } from "./lib/defineCoroutine.ts";

export {
    defineTask, TaskEvent, emit,
    useTasks,
    defineCoroutine
}

import type { Task, TaskWorker, TaskEventInterface, TaskTrigger, TaskOptions, TaskModule, TaskCronScheduleSchema, TaskCronScheduleSchemaItem } from "./lib/defineTask.ts"
import type { Log } from "./lib/useTasks.ts";
import type { TaskAsyncWorker, TaskAsyncEventInterface } from "./lib/defineCoroutine.ts";

export type {
    Task, TaskWorker, TaskEventInterface, TaskTrigger, TaskOptions, TaskModule, TaskCronScheduleSchema, TaskCronScheduleSchemaItem,
    Log,
    TaskAsyncWorker, TaskAsyncEventInterface
}
