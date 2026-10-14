# Advanced Types

These features let you compute new types from existing ones. You'll read them in libraries more often than you write them, but understanding them makes errors much less mysterious.

## `typeof` in types

Get the type of a *value*:

```typescript
const config = { port: 8000, host: "localhost", debug: false };
type Config = typeof config;   // { port: number; host: string; debug: boolean }
```

## `keyof`

Get the keys of a type as a union:

```typescript
type ConfigKey = keyof Config;   // "port" | "host" | "debug"

function setting(key: ConfigKey) { return config[key]; }
setting("port");  // ✅
setting("pots");  // ❌ Error
```

## Indexed access types

```typescript
type Port = Config["port"];                 // number
type HostOrPort = Config["host" | "port"];  // string | number

const ROLES = ["owner", "viewer"] as const;
type Role = (typeof ROLES)[number];         // "owner" | "viewer"
```

## Mapped types

Build an object type by looping over keys. This is how `Partial` and `Readonly` are made:

```typescript
type MyPartial<T> = { [K in keyof T]?: T[K] };
type MyReadonly<T> = { readonly [K in keyof T]: T[K] };

// Turn every property into a validation message:
type Errors<T> = { [K in keyof T]?: string };
const formErrors: Errors<Config> = { port: "Must be a number" };
```

Rename keys with `as`:

```typescript
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type ConfigGetters = Getters<Config>; // { getPort(): number; getHost(): string; getDebug(): boolean }
```

## Template literal types

```typescript
type Size = "sm" | "md" | "lg";
type Color = "red" | "blue";
type ClassName = `btn-${Size}-${Color}`;  // "btn-sm-red" | "btn-sm-blue" | ... (6 combinations)

type EventName = `on${Capitalize<"click" | "focus">}`; // "onClick" | "onFocus"
```

## Conditional types

`A extends B ? X : Y` is an `if` for types:

```typescript
type IsString<T> = T extends string ? "yes" : "no";
type A = IsString<"hi">;  // "yes"
type B = IsString<42>;    // "no"

// Over a union, it applies to each member ("distributive"):
type NoNulls<T> = T extends null | undefined ? never : T;
type C = NoNulls<string | null | number>;  // string | number
```

## `infer`: pulling a type out

```typescript
type ElementOf<T> = T extends (infer E)[] ? E : never;
type E1 = ElementOf<string[]>;   // string

type Unwrap<T> = T extends Promise<infer V> ? V : T;
type E2 = Unwrap<Promise<number>>;  // number
```

This is how built-ins like `ReturnType` and `Awaited` work.

## `satisfies`

Check that a value matches a type **without** losing its more specific inferred type:

```typescript
type Theme = Record<string, string>;

const colors = {
  primary: "#0066ff",
  danger: "#d11",
} satisfies Theme;

colors.primary;   // ✅ known key (with ": Theme" it would be any string key)
colors.secndary;  // ❌ Error: typo caught
```

StudyVault's upload route uses `res.json({ page_id: target } satisfies UploadResult)`.

## Declaration merging and module augmentation

Interfaces with the same name merge. Libraries rely on this so you can add properties. StudyVault adds `req.user` to Express like this (`src/server/auth.ts`):

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}
```

## Branded types

Two `number`s can mean different things (a student ID vs a course ID). A **brand** keeps them apart:

```typescript
type StudentId = number & { readonly __brand: "StudentId" };
type CourseId = number & { readonly __brand: "CourseId" };

const asStudentId = (n: number) => n as StudentId;

function enroll(s: StudentId, c: CourseId) { /* ... */ }
const sid = asStudentId(5);
enroll(sid, sid); // ❌ Error: StudentId is not a CourseId
```

## Key points

- `typeof value`, `keyof Type` and `Type[Key]` connect values and types.
- Mapped types loop over keys; template literal types build string unions.
- Conditional types with `infer` compute and extract types.
- `satisfies` checks without widening; brands prevent mixing up same-shaped values.

## Practice

1. Write `type Nullable<T> = { [K in keyof T]: T[K] | null }`.
2. Write `type Setters<T>` producing `setName(v: string): void` and so on.
3. Write `type ArgsOf<F>` that works like `Parameters<F>`, using `infer`.
