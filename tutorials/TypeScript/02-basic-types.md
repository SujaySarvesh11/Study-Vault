# Basic Types

Every value in TypeScript has a **type**. This lesson covers the building blocks.

## Type annotations

Write `: Type` after a variable name:

```typescript
let city: string = "Chennai";
let marks: number = 92.5;        // integers and decimals are both "number"
let passed: boolean = true;
```

## Type inference

You usually **don't need** to write the type. TypeScript infers it from the value:

```typescript
let city = "Chennai";   // inferred: string
city = 42;              // ❌ Error: Type 'number' is not assignable to type 'string'.
```

> **Rule of thumb:** let TypeScript infer variable types. Write types on **function parameters** and when a variable starts empty.

## `let` vs `const` and literal types

```typescript
let a = "hello";    // type: string  (can change to any string)
const b = "hello";  // type: "hello" (a const can never change, so its type is that exact value)
```

The type `"hello"` is a **literal type**: only that exact value is allowed. Literal types become very useful with unions (see *Union Types and Narrowing*).

## The primitive types

| Type | Example values |
|---|---|
| `string` | `"hi"`, `'hi'`, `` `hi ${name}` `` |
| `number` | `42`, `3.14`, `-7`, `NaN`, `Infinity` |
| `boolean` | `true`, `false` |
| `bigint` | `9007199254740993n` (very large integers) |
| `symbol` | `Symbol("id")` (unique keys) |
| `null` | `null`, meaning "intentionally empty" |
| `undefined` | `undefined`, meaning "not set yet" |

## `null` and `undefined` with `strict` mode

With `"strict": true` in `tsconfig.json` (always turn it on), `null` and `undefined` are **not** allowed unless you say so:

```typescript
let nickname: string = null;            // ❌ Error
let nickname2: string | null = null;    // ✅ "string or null"
```

## Arrays

```typescript
const scores: number[] = [90, 85, 77];
const names: Array<string> = ["Asha", "Ravi"];   // same thing, other spelling

scores.push(100);     // ✅
scores.push("100");   // ❌ Error: string is not a number
```

## `any`: switching the checker off

`any` means "allow anything". It turns off type checking for that value:

```typescript
let data: any = "text";
data.toFixed(2);   // no error while writing... crashes at runtime!
```

> **Avoid `any`.** It hides exactly the bugs TypeScript exists to catch. Use `unknown` instead (next).

## `unknown`: the safe "anything"

`unknown` also accepts any value, but you must **check** what it is before using it:

```typescript
let input: unknown = JSON.parse('"42"');

input.toUpperCase();              // ❌ Error: 'input' is of type 'unknown'.
if (typeof input === "string") {
  console.log(input.toUpperCase()); // ✅ inside this if, TypeScript knows it's a string
}
```

## `void` and `never`

```typescript
function log(msg: string): void {      // returns nothing useful
  console.log(msg);
}

function fail(msg: string): never {    // never returns at all
  throw new Error(msg);
}
```

## Type assertions (`as`)

`as` tells TypeScript "trust me, I know the type":

```typescript
const input = document.getElementById("email") as HTMLInputElement;
console.log(input.value);
```

Use it rarely. If you are wrong, TypeScript can't help you, and the program crashes at runtime.

## Key points

- Let TypeScript **infer** types for variables; annotate function parameters.
- Use `strict` mode, so `null`/`undefined` must be allowed explicitly.
- Prefer `unknown` over `any`.
- `as` is a promise to the compiler, not a check.

## Practice

1. Declare `const pi = 3.14`. Hover over `pi` in VS Code: what type is shown? Then try `let`.
2. Make an array of booleans and try to push a number.
3. Write `function parseAge(v: unknown): number` that returns `v` if it is a number, otherwise `0`.
