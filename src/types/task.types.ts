import type { DeepReadonly } from "./utils.types.ts";

export type Task = (event: ReadonlyTaskEvent) => void | Promise<void>

export type TaskWorker = () => void

export type ReadonlyTaskEvent = DeepReadonly<TaskEvent>

export type TaskEvent = {
    state: {
        status: 'pending' | 'running' | 'success' | 'failed' | 'killed' | 'canceled'
        attempt?: number
        more?: number
    }
    data: {
        name: string
        trigger: TaskTrigger
        uuid: string
        cron: boolean
    }
    options?: TaskOptions
    task: Task
    worker: TaskWorker
    kill: () => void
    cancel: () => void
    emit: (event: string) => void
}

export type TaskTrigger = string | Deno.CronSchedule

export type TaskOptions = {
    retry?: number
    delay?: number
    times?: number
}

export type TaskModule = (task: Task, trigger: TaskTrigger, options?: TaskOptions) => void