import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("contains the LabTime application and a completed build", async () => {
  const [layout, page] = await Promise.all([
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    access(new URL("dist/server/index.js", projectRoot)),
  ]);

  assert.match(layout, /title:\s*["']LabTime \| マシンタイム予約["']/);
  assert.match(layout, /<html lang=["']ja["']/);
  assert.match(page, />予約カレンダー</);
  assert.match(page, />自分の予約</);
  assert.match(page, /\/cdn-cgi\/access\/logout/);
  assert.doesNotMatch(page, /Your site is taking shape|Codex is working/i);
});
