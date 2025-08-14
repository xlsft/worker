// deno-lint-ignore-file no-explicit-any
export type DeepReadonly<T> =
    T extends (...args: any[]) => any
        ? T 
        : T extends readonly any[]
            ? ReadonlyArray<DeepReadonly<T[number]>>
            : T extends object
                ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
                : T 
