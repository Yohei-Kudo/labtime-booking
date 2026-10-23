import assert from "node:assert/strict";
import test from "node:test";
import { parseBookingInput } from "../app/api/validation.ts";

const booking = (startAt, endAt) => ({ machineId: 1, usageType: "DEVICE", startAt, endAt, note: "" });

test("accepts quarter-hour bookings with an optional note", () => {
  const parsed = parseBookingInput(booking("2026-10-24T09:15", "2026-10-24T09:30"));
  assert.ok(parsed);
  assert.equal(parsed.title, "予約");
});

test("accepts a continuous 24-hour booking", () => {
  const parsed = parseBookingInput(booking("2026-10-24T00:00", "2026-10-25T00:00"));
  assert.ok(parsed);
  assert.equal(parsed.startAt, "2026-10-24T00:00");
  assert.equal(parsed.endAt, "2026-10-25T00:00");
});

test("rejects times that are not on a quarter-hour boundary", () => {
  assert.equal(parseBookingInput(booking("2026-10-24T09:10", "2026-10-24T09:30")), null);
  assert.equal(parseBookingInput(booking("2026-10-24T09:15", "2026-10-24T09:31")), null);
});
