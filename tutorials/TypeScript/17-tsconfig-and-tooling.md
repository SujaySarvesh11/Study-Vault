# tsconfig and Tooling

`tsconfig.json` tells the TypeScript compiler which files to check and how strict to be.

## A recommended starting point

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

## The important options

| Option | What it does |
|---|---|
| `strict` | Turns on all the strict checks below. **Always use it.** |
| `strictNullChecks` (part of strict) | `null`/`undefined` must be allowed explicitly. |
| `noImplicitAny` (part of strict) | Errors when a type can't be inferred and would silently be `any`. |
| `noUncheckedIndexedAccess` | `arr[i]` and `obj[key]` include `undefined`, since the item may not exist. |
| `noImplicitOverride` | Methods that override a parent must say `override`. |
| `target` | Which JavaScript version to output (`es2022`, `esnext`...). |
| `module` / `moduleResolution` | How imports work: `nodenext` for Node, `bundler` for esbuild/Vite. |
| `lib` | Which built-in APIs exist: add `"dom"` for browser code. |
| `types` | Which `@types` packages to load globally (e.g. `["node"]`). |
| `noEmit` | Only check; don't write `.js` files. |
| `outDir` / `rootDir` | Where `.js` output goes and where sources live (when emitting). |
| `sourceMap` | Emit `.map` files so debuggers show TypeScript. |
| `verbatimModuleSyntax` | Requires `import type` for type-only imports. |
| `erasableSyntaxOnly` | Forbids enums, namespaces and parameter properties, which can't simply be stripped. |
| `allowImportingTsExtensions` | Lets imports end in `.ts` (needs `noEmit` or a bundler). |
| `skipLibCheck` | Don't type-check `.d.ts` files in `node_modules` (faster). |

## Two setups

**Node runs the `.ts` files (StudyVault's server):**

```json
{ "compilerOptions": { "module": "nodenext", "noEmit": true, "allowImportingTsExtensions": true, "erasableSyntaxOnly": true, "verbatimModuleSyntax": true } }
```

**Compile to JavaScript with tsc:**

```json
{ "compilerOptions": { "module": "nodenext", "outDir": "dist", "rootDir": "src", "sourceMap": true, "declaration": true } }
```

Then `npx tsc` writes `dist/*.js`, and you run `node dist/server.js`.

## Several configs in one project

StudyVault has two: the root `tsconfig.json` for server code (Node types, no DOM) and `src/client/tsconfig.json` for browser code (DOM types, no Node). That stops browser code from using `fs` and server code from using `document` by mistake.

```bash
npx tsc -p .            # check server
npx tsc -p src/client   # check browser code
```

## Useful commands

```bash
npx tsc --noEmit          # check everything once
npx tsc --noEmit --watch  # keep checking as you save
npx tsc --showConfig      # print the final settings
npx tsc --init            # create a new tsconfig.json
```

## Editor tips (VS Code)

- **Hover** over anything to see its type. This is the fastest way to learn.
- **F12** goes to a definition; **Shift+F12** finds all references.
- **F2** renames a symbol everywhere, safely.
- **Ctrl+.** on a red underline offers quick fixes (add import, add missing property...).
- Problems panel (**Ctrl+Shift+M**) lists every error in the project.

## Other tools you'll meet

| Tool | Purpose |
|---|---|
| **esbuild** / **Vite** | Bundle TypeScript for the browser (fast, no type checking) |
| **tsx** | Run TypeScript in Node with full transform support (enums etc.) |
| **ESLint** + `typescript-eslint` | Catch bad patterns beyond type errors |
| **Prettier** | Automatic code formatting |
| **zod** | Runtime validation that produces types |

> Bundlers and Node's type stripping **don't check types**; they just remove them. Always run `tsc` (or watch the editor) as well. StudyVault's `test.bat` runs `npm run typecheck` before the tests.

## Key points

- Start with `strict: true` and add `noUncheckedIndexedAccess`.
- Choose `module`/`moduleResolution` for how the code runs (Node vs bundler).
- Use separate configs for browser and server code.
- `tsc --noEmit` checks; bundlers and Node only strip.

## Practice

1. Turn on `noUncheckedIndexedAccess` in a small project and fix the new errors.
2. Run `npx tsc --showConfig` in StudyVault and read the output.
3. Try writing `document.title` in a server file and see which config catches it.
