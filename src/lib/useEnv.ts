import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

export const useEnv = async (callback?: (c: number) => void) => {
    const env = await load()
    let count = 0
    for (const key in env) {
        Deno.env.set(key, env[key])
        count++
    }
    if (callback) callback(count)
    return env
}