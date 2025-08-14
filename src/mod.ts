import { defineTask, TaskEvent } from "./lib/defineTask.ts";
import { useTasks, event } from "./lib/useTasks.ts";

export {
    defineTask, TaskEvent,
    useTasks, event,
}

import type { Task, TaskWorker, TaskEventInterface, TaskTrigger, TaskOptions, TaskModule } from "./types/task.types.ts"
import type { Log } from "./types/log.types.ts";

export type {
    Task, TaskWorker, TaskEventInterface, TaskTrigger, TaskOptions, TaskModule,
    Log,
}
