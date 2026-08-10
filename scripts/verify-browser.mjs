import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(rootDir, "tests/browser");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const boxOf = async (locator, label) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert(box, `${label} is not visible`);
  return box;
};

const dragBy = async (page, locator, dx, dy, label) => {
  const box = await boxOf(locator, label);
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(24, Math.max(8, box.height / 2));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 });
  await page.mouse.up();
};

const resizeDown = async (page, card, dy, label) => {
  const handle = card.locator('[data-ag-resize-direction="end"], [data-ag-resize-handle]').last();
  const box = (await handle.boundingBox()) ?? (await boxOf(card, label));
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 8 });
  await page.mouse.up();
};

const styleSignature = (locator) =>
  locator.evaluate((node) => {
    const style = getComputedStyle(node);
    return `${style.backgroundColor}|${style.borderColor}|${style.getPropertyValue("--za-event-color")}`;
  });

const assertActiveInside = async (page, locator, message) => {
  const inside = await locator.evaluate((node) => node.contains(document.activeElement));
  assert(inside, message);
};

const textOf = (locator) => locator.textContent().then((text) => text ?? "");
const browserErrors = [];

const assertNoBrowserErrors = () => {
  if (browserErrors.length === 0) return;
  throw browserErrors[0];
};

const runStep = async (label, fn) => {
  const start = Date.now();
  await fn();
  assertNoBrowserErrors();
  console.log(`OK ${label} (${Date.now() - start}ms)`);
};

let server;
let browser;

try {
  server = await createServer({
    root: fixtureRoot,
    logLevel: "error",
    plugins: [react()],
    server: { host: "127.0.0.1", port: 0, strictPort: false },
  });
  await server.listen();

  const url = server.resolvedUrls?.local?.[0];
  assert(url, "Vite did not expose a local URL");

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (error) => {
    browserErrors.push(error);
  });
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(new Error(message.text()));
  });

  await page.goto(url);
  await page.getByTestId("ready").waitFor();

  await runStep("React drag persists and keeps color", async () => {
    const card = page.getByRole("button", { name: /Olivia Carter/i });
    const beforeBox = await boxOf(card, "React move card");
    const beforeColor = await styleSignature(card);

    await dragBy(page, card, 0, 136, "React move card");
    await expectLog(page.getByTestId("react-log"), /react:move:react-move/);

    const afterBox = await boxOf(card, "React moved card");
    const afterColor = await styleSignature(card);
    assert(afterBox.y > beforeBox.y + 80, "React card did not move down");
    assert(afterColor === beforeColor, "React card color changed after drag");
  });

  await runStep("React conflict blocks without losing the card", async () => {
    const card = page.getByRole("button", { name: /Olivia Carter/i });
    await dragBy(page, card, 0, 136, "React conflict move");
    await expectLog(page.getByTestId("react-log"), /react:blocked:/);
    await card.waitFor({ state: "visible" });
  });

  await runStep("React resize and details modal work", async () => {
    const card = page.getByRole("button", { name: /Lucas Bennett/i });
    const before = await boxOf(card, "React resize card");
    await resizeDown(page, card, 68, "React resize card");
    await expectLog(page.getByTestId("react-log"), /react:resize:react-resize/);
    const after = await boxOf(card, "React resized card");
    assert(after.height > before.height + 25, "React card height did not increase");

    const detailsCard = page.getByRole("button", { name: /Olivia Carter/i });
    await detailsCard.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: /Olivia Carter/i });
    await dialog.waitFor({ state: "visible" });
    assert(/Physical therapy follow-up/i.test(await textOf(dialog)), "React details modal missed service data");
    await assertActiveInside(page, dialog, "React details modal did not receive keyboard focus");
    await page.keyboard.press("Shift+Tab");
    await assertActiveInside(page, dialog, "React details modal did not keep Shift+Tab inside");
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    const focusReturned = await detailsCard.evaluate((node) => document.activeElement === node);
    assert(focusReturned, "React details modal did not restore focus to the appointment card");
  });

  await runStep("Web Component move/resize events include ISO ranges", async () => {
    const host = page.locator("#element-a");
    const card = host.locator('[data-event-id="element-move"]');
    const beforeColor = await styleSignature(card);

    await dragBy(page, card, 0, 136, "Element move card");
    await expectLog(page.getByTestId("element-a-log"), /element:move:element-move:2030-/);
    const afterColor = await styleSignature(card);
    assert(afterColor === beforeColor, "Element card color changed after drag");

    const resizeCard = host.locator('[data-event-id="element-resize"]');
    const before = await boxOf(resizeCard, "Element resize card");
    await resizeDown(page, resizeCard, 68, "Element resize card");
    await expectLog(page.getByTestId("element-a-log"), /element:resize:element-resize:2030-/);
    const after = await boxOf(resizeCard, "Element resized card");
    assert(after.height > before.height + 25, "Element card height did not increase");
  });

  await runStep("Web Component conflict, modal and instance isolation work", async () => {
    const host = page.locator("#element-a");
    const card = host.locator('[data-event-id="element-move"]');
    await dragBy(page, card, 0, 136, "Element conflict move");
    await expectLog(page.getByTestId("element-a-log"), /element:blocked:/);
    await card.waitFor({ state: "visible" });

    await card.click();
    const sheet = host.locator(".za-sheet");
    await sheet.waitFor({ state: "visible" });
    assert(/Mia Johnson/i.test(await textOf(sheet)), "Element details sheet missed client data");

    const secondHost = page.locator("#element-b");
    await secondHost.locator('[data-event-id="element-b-only"]').waitFor({ state: "visible" });
    assert((await secondHost.locator(".za-sheet").count()) === 0, "Second element instance opened a sheet");
  });

  await runStep("Web Component four instances stay isolated", async () => {
    const hosts = ["element-a", "element-b", "element-c", "element-d"];
    for (const id of hosts) {
      await page.locator(`#${id}`).waitFor({ state: "visible" });
    }
    assert((await page.locator("zigo-scheduler").count()) === 4, "Expected four Web Component instances");

    await page.keyboard.press("Escape");
    await page.locator("zigo-scheduler .za-sheet").first().waitFor({ state: "detached" }).catch(() => {});

    const thirdHost = page.locator("#element-c");
    const thirdCard = thirdHost.locator('[data-event-id="element-c-only"]');
    const thirdColor = await styleSignature(thirdCard);
    await dragBy(page, thirdCard, 0, 68, "Element third move");
    await expectLog(page.getByTestId("element-c-log"), /element:move:element-c-only:2030-/);
    assert((await styleSignature(thirdCard)) === thirdColor, "Third element card color changed after drag");
    assert(!/element-c-only/.test(await textOf(page.getByTestId("element-a-log"))), "First instance received third move");
    assert(!/element-c-only/.test(await textOf(page.getByTestId("element-b-log"))), "Second instance received third move");
    assert(!/element-c-only/.test(await textOf(page.getByTestId("element-d-log"))), "Fourth instance received third move");

    const fourthHost = page.locator("#element-d");
    const fourthCard = fourthHost.locator('[data-event-id="element-d-only"]');
    const before = await boxOf(fourthCard, "Element fourth resize card");
    await resizeDown(page, fourthCard, 68, "Element fourth resize card");
    await expectLog(page.getByTestId("element-d-log"), /element:resize:element-d-only:2030-/);
    const after = await boxOf(fourthCard, "Element fourth resized card");
    assert(after.height > before.height + 25, "Fourth element card height did not increase");
    assert(!/element-d-only/.test(await textOf(page.getByTestId("element-a-log"))), "First instance received fourth resize");
    assert(!/element-d-only/.test(await textOf(page.getByTestId("element-b-log"))), "Second instance received fourth resize");
    assert(!/element-d-only/.test(await textOf(page.getByTestId("element-c-log"))), "Third instance received fourth resize");
  });
} finally {
  await browser?.close();
  await server?.close();
}

async function expectLog(locator, pattern) {
  const deadline = Date.now() + 5_000;
  let lastText = "";
  while (Date.now() < deadline) {
    lastText = await textOf(locator);
    if (pattern.test(lastText)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Expected ${pattern} in log, got "${lastText}"`);
}
