# Functions

Functions are where types help the most: they document what goes in and what comes out.

## Parameter and return types

```typescript
function add(a: number, b: number): number {
  return a + b;
}

// Arrow function: same idea
const multiply = (a: number, b: number): number => a * b;
```

The return type can usually be inferred, but writing it on exported functions is good practice: it stops you from returning the wrong thing by accident.

## Optional and default parameters

```typescript
function greet(name: string, greeting?: string): string {   // ? = may be left out
  return `${greeting ?? "Hello"}, ${name}`;
}
greet("Asha");            // "Hello, Asha"
greet("Asha", "Vanakkam"); // "Vanakkam, Asha"

function power(base: number, exp = 2): number {  // default value; type inferred as number
  return base ** exp;
}
```

Inside `greet`, `greeting` has type `string | undefined`. The `??` operator gives a fallback when a value is `null` or `undefined`.

## Rest parameters

```typescript
function sum(...nums: number[]): number {
  return nums.reduce((total, n) => total + n, 0);
}
sum(1, 2, 3, 4); // 10
```

## Object parameters

Many arguments are easier to read as one object:

```typescript
function createUser({ name, age, admin = false }: { name: string; age: number; admin?: boolean }) {
  return { name, age, admin };
}
createUser({ name: "Ravi", age: 20 });
```

## Function types

A variable can hold a function. Describe its shape with `(params) => return`:

```typescript
type MathOp = (a: number, b: number) => number;

const subtract: MathOp = (a, b) => a - b;   // a and b are inferred as number

function applyTwice(fn: (x: number) => number, value: number): number {
  return fn(fn(value));
}
applyTwice((x) => x * 3, 2); // 18
```

## Callbacks

```typescript
const marks = [72, 95, 64, 88];
const passed = marks.filter((m) => m >= 70);     // m: number (inferred from the array)
const labels = marks.map((m) => `${m}%`);        // string[]
```

You rarely need to annotate callback parameters; TypeScript infers them from context.

## Overloads

Sometimes the return type depends on the argument type. **Overloads** list each allowed combination:

```typescript
function format(value: number): string;
function format(value: Date): string;
function format(value: number | Date): string {
  return typeof value === "number" ? value.toFixed(2) : value.toISOString();
}
format(3.14159);     // "3.14"
format(new Date());  // "2026-..."
```

Often a union type is simpler than overloads. Use overloads only when it really helps callers.

## `this` in functions

Arrow functions use the `this` of the code around them; normal functions get their own. In TypeScript classes, prefer arrow functions for callbacks to avoid "this is undefined" bugs (see *Classes*).

## Key points

- Annotate parameters; the return type is often inferred, but write it for public functions.
- `?` makes a parameter optional; `= value` gives a default.
- `(a: T) => R` describes a function type.
- Callback parameters are inferred from context.

## Practice

1. Write `average(...nums: number[]): number` that returns `0` for no numbers.
2. Write `type Validator = (value: string) => boolean` and two validators: `isEmail`, `isNotEmpty`.
3. Write `repeat(text: string, times = 1, separator?: string): string`.
