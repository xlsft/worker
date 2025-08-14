// deno-lint-ignore-file no-explicit-any
export type Log = {
    error: (...message: any[]) => void,
    info: (...message: any[]) => void,
}