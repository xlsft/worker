import type { Task, TaskEvent, TaskModule, TaskTrigger, TaskWorker } from "../types/task.types.ts"
import { isCron, events, useUUID, log } from "tasks";

export const defineTask: TaskModule = (task: Task, trigger: TaskTrigger) => {
    const caller  = ((((new Error().stack?.split("\n") || [])[2].match(/(file:\/\/\/?.*?):\d+:\d+/))?.[1])?.split('/').at(-1) || "00.unknown.task.ts").split('.');

    const worker: TaskWorker = async () => { try {
        event.status = 'running'
        await task(event)
        event.status = 'success'
        log.ok(`✅ Task successfully completed`, event)
    } catch (e) { log.error(e); event.status = 'failed'; log.ok(`❌ Task failed`, event)}; event.status = 'pending' }

    const event: TaskEvent = {
        status: 'pending',
        name: isNaN(Number(caller[0])) ? caller[0] : caller[1],
        trigger,
        uuid: useUUID(),
        cron: isCron(trigger),
        task, worker
    }

    log.info(`🎯 Defining new task`, event)

    if (event.cron) Deno.cron(event.uuid, event.trigger, worker)
    else events.on(event.trigger as string, worker)
}