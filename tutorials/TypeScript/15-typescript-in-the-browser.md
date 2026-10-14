# TypeScript in the Browser (DOM)

TypeScript knows every browser API: elements, events, `fetch`, `localStorage`. Turn them on with `"lib": ["dom", "dom.iterable", "es2023"]` in `tsconfig.json`.

## Selecting elements

`querySelector` can return `null`, and it doesn't know *which* element you mean:

```typescript
const input = document.querySelector("#email");   // Element | null
input.value;                                      // ❌ 'input' is possibly 'null' / no 'value' on Element
```

Tell it the element type, and handle the missing case:

```typescript
const input = document.querySelector<HTMLInputElement>("#email");
if (input) console.log(input.value);              // ✅
```

Selecting by tag name gives the right type automatically:

```typescript
const form = document.querySelector("form");        // HTMLFormElement | null
const buttons = document.querySelectorAll("button"); // NodeListOf<HTMLButtonElement>
```

## A helper that fails loudly

StudyVault's `src/client/dom.ts` uses a helper that throws if the element is missing, so typos in selectors show up immediately:

```typescript
export function $<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

const title = $<HTMLInputElement>("#edTitle").value;
```

## Common element types

| Element | Type | Useful properties |
|---|---|---|
| `<input>` | `HTMLInputElement` | `value`, `checked`, `files` |
| `<textarea>` | `HTMLTextAreaElement` | `value`, `selectionStart` |
| `<select>` | `HTMLSelectElement` | `value`, `selectedIndex` |
| `<form>` | `HTMLFormElement` | `reset()`, `requestSubmit()` |
| `<button>` | `HTMLButtonElement` | `disabled` |
| `<a>` | `HTMLAnchorElement` | `href` |
| `<img>` | `HTMLImageElement` | `src`, `alt` |
| any | `HTMLElement` | `textContent`, `classList`, `dataset`, `style` |

## Events

Event handlers get the correct event type automatically:

```typescript
const button = $<HTMLButtonElement>("#save");

button.addEventListener("click", (e) => {     // e: MouseEvent
  console.log(e.clientX, e.clientY);
});

document.addEventListener("keydown", (e) => { // e: KeyboardEvent
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    save();
  }
});
```

`e.target` is only typed as `EventTarget | null`, since the event may come from a child element. Use the variable you attached the listener to, or check it:

```typescript
form.addEventListener("input", (e) => {
  if (e.target instanceof HTMLInputElement) console.log(e.target.name, e.target.value);
});
```

## Forms

```typescript
const form = $<HTMLFormElement>("#signup");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const name = String(data.get("name") ?? "");
  const age = Number(data.get("age"));
  await fetch("/api/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, age }),
  });
});
```

## Creating elements safely

```typescript
function addItem(list: HTMLUListElement, text: string) {
  const li = document.createElement("li");   // HTMLLIElement
  li.textContent = text;                     // ✅ textContent is safe: text is never run as HTML
  list.append(li);
}
```

> **Security:** never put user text into `innerHTML` without escaping or sanitizing it. That's how XSS attacks happen. StudyVault escapes with `esc()` and sanitizes Markdown with DOMPurify.

## localStorage

```typescript
type Theme = "light" | "dark";

function loadTheme(): Theme {
  const t = localStorage.getItem("theme");     // string | null
  return t === "dark" ? "dark" : "light";       // narrow to the allowed values
}
```

## Bundling for the browser

Browsers can't run `.ts`. A **bundler** compiles your TypeScript and its npm imports into one `.js` file:

```bash
npm install -D esbuild
npx esbuild src/app.ts --bundle --outfile=public/app.js --sourcemap
```

StudyVault does this in `scripts/build-client.ts`. Source maps let the browser's dev tools show your original TypeScript when debugging.

## Key points

- Pass the element type to `querySelector<T>()` and handle `null`.
- Event types (`MouseEvent`, `KeyboardEvent`...) are inferred from the event name.
- Use `textContent` for text; sanitize before using `innerHTML`.
- Bundle with esbuild (or Vite) to run TypeScript in the browser.

## Practice

1. Build a to-do list page: an input, an "Add" button and a list, all typed.
2. Save the list to `localStorage` as JSON, and validate it when loading.
3. Add a keyboard shortcut (Ctrl+Enter) that adds the item.
