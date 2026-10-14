import { $, errorMessage } from "./dom.ts";

$<HTMLFormElement>("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#err");
  err.textContent = "";
  try {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: $<HTMLInputElement>("#u").value.trim(),
        password: $<HTMLInputElement>("#p").value,
      }),
    });
    if (!r.ok) {
      err.textContent = await errorMessage(r);
      return;
    }
    location.href = "/";
  } catch {
    err.textContent = "Can't reach the server";
  }
});
