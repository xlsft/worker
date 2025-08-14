export type Task = (event: TaskEventInterface) => void | Promise<void>

export type TaskWorker = () => void

export type TaskEventInterface = {
    state: {
        status: 'pending' | 'running' | 'success' | 'failed' | 'killed' | 'canceled'
        attempt?: number
        more?: number
    }
    data: {
        name: string
        trigger?: TaskTrigger
        cron: boolean
    }
    created: Date
    updated: Date
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

export type TaskModule = (task: Task, trigger?: TaskTrigger, options?: TaskOptions) => void