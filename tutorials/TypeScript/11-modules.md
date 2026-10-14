# Modules: import and export

As a program grows, you split it into files. Each file is a **module**: what it `export`s can be `import`ed by others; everything else stays private to the file.

## Named exports

```typescript
// math.ts
export const PI = 3.14159;

export function circleArea(r: number): number {
  return PI * r * r;
}

export interface Circle { radius: number }

function helper() { /* not exported: private to this file */ }
```

```typescript
// main.ts
import { circleArea, PI, type Circle } from "./math.ts";

const c: Circle = { radius: 2 };
console.log(circleArea(c.radius), PI);
```

## Default exports

A module can have one **default** export, imported without braces under any name:

```typescript
// logger.ts
export default function log(msg: string) { console.log(`[log] ${msg}`); }

// main.ts
import log from "./logger.ts";
```

> Many teams prefer **named exports only**: names stay consistent across files and editors autocomplete them better.

## Renaming and importing everything

```typescript
import { circleArea as area } from "./math.ts";
import * as math from "./math.ts";   // math.PI, math.circleArea(...)
```

## Type-only imports

Types disappear at runtime, so mark imports that are only types:

```typescript
import type { Student } from "./types.ts";
import { loadStudents, type Course } from "./school.ts"; // mixed
```

With `"verbatimModuleSyntax": true` (as in StudyVault), TypeScript **requires** `type` on type-only imports. That way, tools that just strip types (like Node) know which imports to delete.

## File extensions in imports

How you write the path depends on how the code runs:

| Setup | Import style |
|---|---|
| Node running `.ts` directly (StudyVault's server) | `import { x } from "./db.ts"` with `"allowImportingTsExtensions": true` |
| Compiled with `tsc` to `.js` for Node | `import { x } from "./db.js"` (yes, `.js`, the file that will exist at runtime) |
| A bundler (esbuild, Vite, webpack) | `"./db"` or `"./db.ts"`, the bundler resolves it |

## Importing packages

```bash
npm install express
npm install -D @types/express   # type definitions, if the package doesn't include its own
```

```typescript
import express from "express";
import { readFile } from "node:fs/promises";   // Node's built-in modules use the "node:" prefix
```

Packages written in TypeScript include their types. For older JavaScript packages, the community publishes types as `@types/<name>`.

## Declaring types for an untyped package

If no types exist, write a small declaration file (`.d.ts`). StudyVault does this in `src/server/types/turndown-plugin-gfm.d.ts`:

```typescript
declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  export const gfm: TurndownService.Plugin;
}
```

## ES modules vs CommonJS

Modern code uses **ES modules** (`import`/`export`). Older Node code uses **CommonJS** (`require`/`module.exports`). Set `"type": "module"` in `package.json` to use ES modules in Node, as StudyVault does.

```javascript
// CommonJS (old style), for recognising it in older projects
const fs = require("fs");
module.exports = { helper };
```

## Organising a project

```
src/
  shared/   types used by both server and browser
  server/   one module per job: db.ts, auth.ts, search.ts ...
  client/   browser code
```

Keep each module focused on one job, and import shared **types** from one place so every part of the program agrees.

## Key points

- `export` makes something available; `import` uses it. Unexported code is private to its file.
- Prefer named exports. Mark type-only imports with `import type`.
- Install `@types/x` for JavaScript packages without types, or write a `.d.ts`.

## Practice

1. Move the `Student` interface into `types.ts` and import it in two files.
2. Create `utils/strings.ts` exporting `capitalize` and `slugify`, and import both with `import * as`.
3. Turn on `verbatimModuleSyntax` and fix the errors it reports.
