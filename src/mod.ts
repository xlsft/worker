import { defineTask, emit, TaskEvent } from "./lib/defineTask.ts";
import { defineWorker } from "./lib/defineWorker.ts";
import { defineRoutine } from "./lib/defineRoutine.ts";

export {
    defineTask, TaskEvent, emit,
    defineWorker,
    defineRoutine
}

import type { Task, TaskWorker, TaskEventInterface, TaskTrigger, TaskOptions, TaskModule, TaskCronScheduleSchema, TaskCronScheduleSchemaItem } from "./lib/defineTask.ts"
import type { Log } from "./lib/defineWorker.ts";
import type { TaskAsyncWorker, TaskAsyncEventInterface } from "./lib/defineRoutine.ts";

export type {
    Task, TaskWorker, TaskEventInterface, TaskTrigger, TaskOptions, TaskModule, TaskCronScheduleSchema, TaskCronScheduleSchemaItem,
    Log,
    TaskAsyncWorker, TaskAsyncEventInterface
}
