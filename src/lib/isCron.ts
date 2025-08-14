import { TaskTrigger } from "../types/task.types.ts"

export const isCron = (trigger: TaskTrigger) => {
    if (typeof trigger === 'object') return true
    const part = '(\\*|\\d+|\\d+-\\d+|\\*/\\d+|\\d+(,\\d+)*|\\d+-\\d+/\\d+)';
    const regexp = new RegExp(`^${part}\\s+${part}\\s+${part}\\s+${part}\\s+${part}$`);
    return regexp.test(trigger.trim());
}