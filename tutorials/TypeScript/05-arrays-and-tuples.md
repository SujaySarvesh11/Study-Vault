# Arrays and Tuples

## Arrays

An array holds any number of values of the same type:

```typescript
const marks: number[] = [92, 81, 77];
const names = ["Asha", "Ravi"];        // inferred: string[]
const mixed = [1, "two", true];        // inferred: (string | number | boolean)[]
```

Array methods keep their types:

```typescript
const doubled = marks.map((m) => m * 2);        // number[]
const top = marks.find((m) => m > 90);          // number | undefined (maybe nothing matched!)
const total = marks.reduce((sum, m) => sum + m, 0); // number
const sorted = [...marks].sort((a, b) => a - b);    // copy, then sort numbers correctly
```

`find` returns `T | undefined` because there may be no match. TypeScript makes you handle that:

```typescript
console.log(top.toFixed(1));        // ❌ Error: 'top' is possibly 'undefined'.
console.log(top?.toFixed(1));       // ✅ optional chaining: undefined if top is undefined
if (top !== undefined) console.log(top.toFixed(1)); // ✅
```

## Readonly arrays

```typescript
const days: readonly string[] = ["Mon", "Tue", "Wed"];
days.push("Thu");  // ❌ Error: Property 'push' does not exist on type 'readonly string[]'.
```

Use `readonly` for parameters you promise not to change:

```typescript
function average(nums: readonly number[]): number {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}
```

## Tuples

A **tuple** is an array with a fixed length where each position has its own type:

```typescript
const point: [number, number] = [10, 20];
const entry: [string, number] = ["maths", 95];

const [subject, score] = entry;  // subject: string, score: number
```

Give positions names to make them self-documenting:

```typescript
type Range = [start: number, end: number];
type HttpResult = [status: number, body: string, ok?: boolean]; // optional last element
```

Tuples are common as return values:

```typescript
function minMax(nums: number[]): [min: number, max: number] {
  return [Math.min(...nums), Math.max(...nums)];
}
const [lo, hi] = minMax([4, 9, 1]);
```

## `as const`

`as const` makes an array (or object) deeply readonly and keeps exact literal types:

```typescript
const ROLES = ["owner", "viewer"] as const;  // readonly ["owner", "viewer"]
type Role = (typeof ROLES)[number];          // "owner" | "viewer"
```

This trick creates a union type from a list of values, so the list and the type never get out of sync.

## Looping

```typescript
for (const m of marks) { /* m: number */ }
marks.forEach((m, i) => console.log(i, m));
for (const [i, m] of marks.entries()) { /* i: number, m: number */ }
```

## Key points

- `T[]` for lists; `[A, B]` for fixed-position tuples.
- `find`, indexing (with `noUncheckedIndexedAccess`) and `pop` can return `undefined`; handle it.
- `readonly` arrays protect data from accidental changes.
- `as const` + `(typeof X)[number]` turns a list into a union type.

## Practice

1. Write `function topN(marks: readonly number[], n: number): number[]`.
2. Write `function split(full: string): [first: string, last: string]`.
3. Create `const GRADES = ["A", "B", "C", "D", "F"] as const` and a `Grade` type from it.
