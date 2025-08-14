export type Task = (event: TaskEvent) => void | Promise<void>

export type TaskWorker = () => void

export type TaskEvent = {
    status: 'pending' | 'running' | 'success' | 'failed'
    name: string
    trigger: TaskTrigger
    uuid: string
    cron: boolean
    task: Task
    worker: TaskWorker
}

export type TaskTrigger = string | Deno.CronSchedule

export type TaskModule = (task: Task, trigger: TaskTrigger) => void