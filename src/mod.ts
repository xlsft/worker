import { defineTask, TaskEvent } from "./lib/defineTask.ts";
import { useTasks, event } from "./lib/useTasks.ts";

export {
    defineTask, TaskEvent,
    useTasks, event,
}

import type { Task, TaskWorker, TaskEventInterface, TaskTrigger, TaskOptions, TaskModule, TaskCronScheduleSchema, TaskCronScheduleSchemaItem } from "./lib/defineTask.ts"
import type { Log } from "./lib/useTasks.ts";

export type {
    Task, TaskWorker, TaskEventInterface, TaskTrigger, TaskOptions, TaskModule, TaskCronScheduleSchema, TaskCronScheduleSchemaItem,
    Log,
}
