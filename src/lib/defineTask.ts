import type { ReadonlyTaskEvent, Task, TaskEvent, TaskModule, TaskOptions, TaskTrigger, TaskWorker } from "../types/task.types.ts"
import { isCron, events, useUUID, log } from "tasks";

class Kill extends Error {
    override name = 'Kill'
    constructor() {
        super('Task killed')
    }
}

class Cancel extends Error {
    override name = 'Cancel'
    constructor() {
        super('Task canceled')
    }
}

export const defineTask: TaskModule = (task: Task, trigger: TaskTrigger, options?: TaskOptions) => {

    const caller  = ((((new Error().stack?.split("\n") || [])[2].match(/(file:\/\/\/?.*?):\d+:\d+/))?.[1])?.split('/').at(-1) || "00.unknown.task.ts").split('.');

    const worker: TaskWorker = () => { 
        if (event.state.status === 'killed') return;
        let attempts = options?.retry ? options.retry - 1 : 0
        const job = async () => {
            if (options?.retry) event.state.attempt = Math.abs(attempts - options.retry)
            for (let i = 0; i < (options?.times || 1); i++) {
                if (event.state.status === 'canceled') continue
                if (options?.times) event.state.more = (options.times - i) - 1
                if (options?.delay) await new Promise(r => setTimeout(r, options.delay));
                try {
                    event.state.status = 'running'
                    await task(event as ReadonlyTaskEvent)
                    event.state.status = 'success'
                    log.ok(`✅ Task "${event.data.name}" successfully completed`, event)
                } catch (e) { 
                    if (e instanceof Kill) return
                    else if (e instanceof Cancel) continue
                    else { 
                        log.error(e); event.state.status = 'failed'; log.error(`❌ Task "${event.data.name}" failed`, event)
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

    const event: TaskEvent = {
        state: { status: 'pending' },
        data: {
            name: isNaN(Number(caller[0])) ? caller[0] : caller[1],
            trigger,
            uuid: useUUID(),
            cron: isCron(trigger),
        },
        task, worker, options,
        kill: () => {
            event.state.status = 'killed'
            log.info(`🔪 Task killed "${event.data.name}"`, event)
            if (!event.data.cron) events.off(event.data.trigger as string, event.worker)
            throw new Kill();
        },
        cancel: () => {
            event.state.status = 'canceled'
            log.info(`⛔️ Task canceled "${event.data.name}"`, event)
            throw new Cancel();
        },
        emit: events.emit
    }

    log.info(`🎯 Defining new task "${event.data.name}"`, event)

    if (event.data.cron) Deno.cron(event.data.uuid, event.data.trigger, event.worker)
    else events.on(event.data.trigger as string, event.worker)
}