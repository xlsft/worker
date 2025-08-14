import type { Task, TaskEventInterface, TaskModule, TaskOptions, TaskTrigger, TaskWorker } from "../types/task.types.ts"
import { event as events, log } from "./useTasks.ts";

class TaskKill extends Error { override name = 'TaskKill'; constructor() { super('') } }
class TaskCancel extends Error { override name = 'TaskCancel'; constructor() { super('') } }
export class TaskEvent implements TaskEventInterface {

    public readonly created: Date = new Date()
    public readonly updated: Date = new Date()
    public readonly state: TaskEventInterface['state'] = { status: 'pending' }
    public readonly data: TaskEventInterface['data']

    constructor(caller: string[], private worker: TaskWorker, trigger?: TaskTrigger) {
        const name = isNaN(Number(caller[0])) ? caller[0] : caller[1]
        this.data = {
            name: name,
            trigger: trigger || name,
            cron: !!trigger && (typeof trigger === 'object' ||
            (typeof trigger === 'string' && /^(\*|\d+(-\d+)?(\/\d+)?(,\d+)?)(\s+(\*|\d+(-\d+)?(\/\d+)?(,\d+)?)){4}$/.test(trigger.trim())))
        }
    }

    public kill() {
        this.state.status = 'killed'
        log?.info(`🔪 Task killed "${this.data.name}"`, this)
        if (!this.data.cron) events.off((this.data.trigger || this.data.name) as string, this.worker)
        throw new TaskKill();
    }

    public cancel() {
        this.state.status = 'canceled'
        log?.info(`⛔️ Task canceled "${this.data.name}"`, this)
        throw new TaskCancel();
    }

    public readonly emit = events.emit
    
}

export const defineTask: TaskModule = (task: Task, trigger?: TaskTrigger, options?: TaskOptions) => {

    const caller = ((((new Error().stack?.split("\n") || [])[2].match(/(file:\/\/\/?.*?):\d+:\d+/))?.[1])?.split('/').at(-1) || "00.unknown.task.ts").split('.')

    const worker: TaskWorker = () => { 
        if (event.state.status === 'killed') { return };
        let attempts = options?.retry ? options.retry - 1 : 0
        const job = async () => {
            if (options?.retry) event.state.attempt = Math.abs(attempts - options.retry)
            for (let i = 0; i < (options?.times || 1); i++) {
                if (event.state.status === 'canceled') continue
                if (options?.times) event.state.more = (options.times - i) - 1
                if (options?.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
                try {
                    event.state.status = 'running'
                    await task(event)
                    event.state.status = 'success'
                    log?.info(`✅ Task "${event.data.name}" successfully completed`, event)
                } catch (e) { 
                    if (e instanceof TaskKill) return
                    else if (e instanceof TaskCancel) continue
                    else { 
                        log?.error(e); event.state.status = 'failed'; log?.error(`❌ Task "${event.data.name}" failed`, event)
                        event.state.status = 'pending'
                        if (attempts === 0) return
                        attempts--
                        job()
                    }
                };
            }
            if (event.state.status === 'canceled') event.state.status = 'pending'
        }; job()
    }

    const event = new TaskEvent(caller, worker, trigger)

    log?.info(`🎯 Defining new task "${event.data.name}"`, event)

    if (event.data.cron) Deno.cron(event.data.name, event.data.trigger as Deno.CronSchedule, worker)
    else events.on((event.data.trigger || event.data.name) as string, worker)

    return event
}