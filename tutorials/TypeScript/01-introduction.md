# Introduction and Setup

TypeScript is **JavaScript with types**. You write normal JavaScript, and add notes that say what kind of value each variable, parameter and return value holds. A tool called the **TypeScript compiler** (`tsc`) reads those notes and warns you about mistakes *before* you run the code.

## Why use TypeScript?

JavaScript only finds many mistakes while the program runs, often in front of users:

```javascript
function total(price, qty) {
  return price * qty;
}
total("10", 3);   // 30 (string "10" is converted... by luck)
total(10);        // NaN, because qty is undefined
```

The same code in TypeScript:

```typescript
function total(price: number, qty: number): number {
  return price * qty;
}
total("10", 3); // ❌ Error: Argument of type 'string' is not assignable to parameter of type 'number'.
total(10);      // ❌ Error: Expected 2 arguments, but got 1.
```

The editor underlines both mistakes in red as you type. Other benefits:

- **Autocomplete**: the editor knows what properties an object has.
- **Safe refactoring**: rename a property and every place that uses it is updated or flagged.
- **Documentation**: types tell the next reader (often future you) what a function expects.

## How TypeScript runs

Browsers and Node.js run **JavaScript**. TypeScript code is turned into JavaScript by removing the types:

```
hello.ts  ──(tsc or Node's type stripping)──▶  hello.js  ──▶  runs
```

Types exist only while you write code. **They are gone at runtime.** This is important: TypeScript cannot check data that arrives while the program runs (from a user, a file or the network). You must check that data yourself (see the lesson *Error Handling and unknown*).

## Setup

1. Install **Node.js 24 LTS** from <https://nodejs.org>.
2. Install **Visual Studio Code**. It has TypeScript support built in.
3. Create a project folder and install TypeScript:

```bash
mkdir ts-practice
cd ts-practice
npm init -y
npm install -D typescript @types/node
npx tsc --init
```

`npx tsc --init` creates `tsconfig.json`, the settings file (see the lesson *tsconfig and Tooling*).

## Your first program

Create `hello.ts`:

```typescript
const name: string = "Sujay";
const year: number = 2026;

function greet(person: string): string {
  return `Hello, ${person}! Welcome to ${year}.`;
}

console.log(greet(name));
```

Run it. Node.js 24 can run `.ts` files directly; it strips the types and runs the JavaScript that's left:

```bash
node hello.ts
```

To **check** for type errors (Node does not check them, it only removes them):

```bash
npx tsc --noEmit
```

> **Habit to build:** run `npx tsc --noEmit` (or watch the red underlines in VS Code) before running your code.

## Compiling to JavaScript files

If you need `.js` files, for example for an older Node or a browser, let `tsc` write them:

```bash
npx tsc            # reads tsconfig.json, writes .js files
npx tsc --watch    # recompiles whenever you save
```

## Key points

- TypeScript = JavaScript + type annotations, checked before the code runs.
- Types are removed when the code runs; they never slow the program down.
- `node file.ts` runs TypeScript; `npx tsc --noEmit` checks it.
- Every valid JavaScript program is (almost) valid TypeScript, so you can learn step by step.

## Practice

1. Install TypeScript and run `hello.ts`.
2. Change `year` to the string `"2026"` while keeping `: number`. Read the error message.
3. Call `greet()` with no argument. What does `tsc` say?
