import assert from "node:assert/strict"
import process from "node:process"
import { spawn } from "node:child_process"
import { mkdir } from "node:fs/promises"
import { chromium } from "playwright"

const origin = "http://127.0.0.1:5173"
const app = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"], {
  stdio: "inherit",
  env: process.env,
})

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (app.exitCode !== null) throw new Error("Vite exited before becoming ready")
    try {
      const response = await fetch(origin)
      if (response.ok) return
    } catch {
      // The Vite process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error("Vite did not start")
}

async function openApp(context) {
  const page = await context.newPage()
  page.on("pageerror", (error) => {
    console.error("Browser page error:", error)
  })
  await page.goto(origin, { waitUntil: "domcontentloaded" })
  await page.locator(".mobile-add-toggle").waitFor({ timeout: 20000 })
  return page
}

async function authenticate(page, email, mode) {
  await page.getByRole("button", { name: "Вход", exact: true }).click()
  await page.getByRole("tab", { name: mode === "signup" ? "Регистрация" : "Вход" }).click()
  await page.getByPlaceholder("name@example.com").fill(email)
  await page.getByPlaceholder("Минимум 6 символов").fill("example-Password-2026")
  if (mode === "signup") {
    await page.getByPlaceholder("Повтори пароль").fill("example-Password-2026")
  }
  await page.getByRole("button", {
    name: mode === "signup" ? "Создать аккаунт" : "Войти",
    exact: true,
  }).click()
  await page.getByRole("button", { name: "Профиль", exact: true }).waitFor({ timeout: 30000 })
  await page.locator(".mobile-add-toggle").waitFor({ state: "visible", timeout: 30000 })
}

async function logout(page) {
  await page.getByRole("button", { name: "Выйти", exact: true }).click()
  await page.getByRole("button", { name: "Вход", exact: true }).waitFor({ timeout: 30000 })
}

async function assertNoOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    actual: document.documentElement.scrollWidth,
    available: document.documentElement.clientWidth,
  }))
  assert.ok(dimensions.actual <= dimensions.available + 1,
    `Mobile layout overflowed: ${dimensions.actual} > ${dimensions.available}`)
}

let browser
try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  await mkdir("test-results", { recursive: true })
  const contextA = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const pageA = await openApp(contextA)
  await authenticate(pageA, "a@example.test", "signup")

  const habitName = "Smoke test — unique account A habit"
  await pageA.getByRole("button", { name: "+ Добавить" }).click()
  await pageA.getByRole("textbox", { name: "Название навыка" }).fill(habitName)
  await pageA.getByRole("button", { name: "Добавить", exact: true }).click()
  const habitA = pageA.locator(".mobile-skill-card").filter({ hasText: habitName })
  await habitA.waitFor({ state: "visible", timeout: 15000 })
  await habitA.locator(".mobile-skill-header").click()
  await habitA.getByRole("button", { name: `${habitName}, оценка 4` }).click()
  await habitA.locator(".mobile-score-button.selected", { hasText: "4" }).waitFor()
  await assertNoOverflow(pageA)
  await pageA.screenshot({ path: "test-results/account-a-scored.png" })

  // A second browser has no account-specific local cache. It must obtain A's
  // data from the Firebase emulator, then isolate it from another account.
  const contextB = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const pageB = await openApp(contextB)
  await authenticate(pageB, "a@example.test", "signin")
  const rehydratedHabit = pageB.locator(".mobile-skill-card").filter({ hasText: habitName })
  await rehydratedHabit.waitFor({ state: "visible", timeout: 30000 })
  await rehydratedHabit.locator(".mobile-skill-header").click()
  await rehydratedHabit.locator(".mobile-score-button.selected", { hasText: "4" }).waitFor({ timeout: 30000 })
  await logout(pageB)
  await authenticate(pageB, "b@example.test", "signup")
  assert.equal(await pageB.locator(".mobile-skill-card").filter({ hasText: habitName }).count(), 0,
    "Account B must never see account A's habit")
  await assertNoOverflow(pageB)
  await pageB.screenshot({ path: "test-results/account-b-isolated.png" })
  await logout(pageB)
  await authenticate(pageB, "a@example.test", "signin")
  await pageB.locator(".mobile-skill-card").filter({ hasText: habitName }).waitFor({ timeout: 30000 })

  // Legacy shared data remains available to download and restore only with an
  // explicit action in the guest context.
  const legacyContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await legacyContext.addInitScript(() => {
    localStorage.setItem("beat-by-bit-tracker-state-v1", JSON.stringify({
      habits: [{ id: "legacy-1", name: "Legacy recovered exercise", color: "#2f80ed", area: "test" }],
      entries: {},
      dayNotes: {},
      entryNotes: {},
      updatedAt: new Date().toISOString(),
    }))
  })
  const legacyPage = await openApp(legacyContext)
  await legacyPage.getByText("Найдены старые локальные записи").waitFor({ timeout: 15000 })
  legacyPage.once("dialog", (dialog) => dialog.accept())
  await legacyPage.getByRole("button", { name: "Восстановить гостевые данные" }).click()
  await legacyPage.locator(".mobile-skill-card").filter({ hasText: "Legacy recovered exercise" }).waitFor()
  const guestKeyExists = await legacyPage.evaluate(() =>
    Boolean(localStorage.getItem("beat-by-bit-tracker-state-v1:guest")))
  assert.ok(guestKeyExists, "Legacy restore must populate guest cache only")
  await assertNoOverflow(legacyPage)
  await legacyPage.screenshot({ path: "test-results/legacy-recovered.png" })
  console.log("Browser/Firebase smoke tests passed: cross-device sync, isolation, legacy recovery, mobile overflow")
} finally {
  if (browser) await browser.close()
  app.kill("SIGTERM")
}
