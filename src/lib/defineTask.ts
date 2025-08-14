import { event as events, log } from "./useTasks.ts";

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

class TaskKill extends Error { override name = 'TaskKill'; constructor() { super('') } }
class TaskCancel extends Error { override name = 'TaskCancel'; constructor() { super('') } }
/**
 * Represents a task event, including its state, data, and execution control methods.
 * Implements TaskEventInterface.
 */
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

/**
 * Define and register a new task.
 * 
 * @example - Cron based `cron syntax`
    ```ts
    import { defineTask } from "@xlsft/worker";

    export default defineTask((event) => {
        console.log('Running every minute');
    }, '* * * * *');
    ```
 * @example - Cron based `Deno.CronSchedule`
    ```ts
    import { defineTask } from "@xlsft/worker";

    export default defineTask((event) => {
        console.log('Running every 30 minutes');
    }, { minute: { every: 30 } });
    ```
 * @example - Event based
    ```ts
    import { defineTask } from "@xlsft/worker";

    export default defineTask((event) => {
        console.log('Triggered by event.emit("event")');
    }, 'event');
    ```
 * @example - Event based from generated trigger (from task name)
    ```ts
    // name.task.ts

    import { defineTask } from "@xlsft/worker";

    export default defineTask(() => {
        console.log('Triggered by event.emit("name")');
    });
    ```
 * @example - Calling a Task from Another Task
    ```ts
    // 01.parent.task.ts

    import { defineTask } from "@xlsft/worker";

    export default defineTask(async (event) => {
        console.log('Parent job running...');
        event.emit('children');
    }, { minute: { every: 1 } });

    // 02.children.task.ts

    import { defineTask, events } from "tasks";

    export default defineTask(async () => {
        console.log('Children job running');
    }, 'children');
    ```
 * @example - Killing or Canceling Task

    You can kill or cancel task using `event.kill()` or `event.cancel()`

    The difference between canceling and killing a job is that canceling stops only the current run and allows you to start a new one, whereas killing stops the job entirely and it cannot be restarted

    ```ts
    // first_job.task.ts

    import { defineTask } from "@xlsft/worker"

    export default defineTask((event) => {
        console.log('Job running');
        event.cancel();
        console.log('Unreachable');
    }, 'first_job');

    // second_job.task.ts

    import { defineTask } from "@xlsft/worker"

    export default defineTask((event) => {
        console.log('Start first job');
        event.emit('first_job'); // Works!
    }, { minute: { every: 1 }});
    ```

    ```ts
    // first_job.task.ts

    import { defineTask } from "@xlsft/worker"

    export default defineTask((event) => {
        console.log('Job running');
        event.kill();
        console.log('Unreachable');
    }, 'first_job');

    // second_job.task.ts

    import { defineTask } from "@xlsft/worker"

    export default defineTask((event) => {
        console.log('Start first job');
        event.emit('first_job'); // Doesn`t work :(
    }, { minute: { every: 1 }});
    ```
 * @example - Task Options

    Now you can set 3 different modifications to your worker

    1. `retry` – number of additional attempts the worker will make if the task fails
    2. `times` – number of times the task should run in a single execution
    3. `delay` – time in milliseconds to wait between task executions or retries

    ```ts
    export default defineTask(async () => {
        console.log('Task starts, but fails');
        throw new Error('Error');
    }, 'event', { times: 2, delay: 2000, retry: 5 });
    ```
    In this example:

    - The task will run 2 times (times: 2), but, if it fails, job will retry with 2 times again
    - It will wait 2 seconds between each run or retry (delay: 2000)
    - If it fails, it will retry up to 5 times (retry: 5)

 */
export const defineTask = (task: Task, trigger?: TaskTrigger, options?: TaskOptions): TaskEvent => {

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
                    await task(event as TaskEvent)
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