export type BookingInput = {
  machineId: number;
  usageType: "GPU" | "CPU" | "DEVICE";
  title: string;
  startAt: string;
  endAt: string;
  note: string;
};

export function parseBookingInput(value: unknown): BookingInput | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const machineId = Number(body.machineId);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const usageType = body.usageType;
  const startAt = typeof body.startAt === "string" ? body.startAt : "";
  const endAt = typeof body.endAt === "string" ? body.endAt : "";
  const start = new Date(startAt);
  const end = new Date(endAt);
  if (!Number.isInteger(machineId) || machineId < 1) return null;
  if (!title || title.length > 100 || note.length > 500) return null;
  if (usageType !== "GPU" && usageType !== "CPU" && usageType !== "DEVICE") return null;
  if (!startAt || !endAt || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end <= start || end.getTime() - start.getTime() > 31 * 24 * 60 * 60 * 1000) return null;
  return { machineId, usageType, title, startAt, endAt, note };
}

export function parseMachineInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const spec = typeof body.spec === "string" ? body.spec.trim() : "";
  const status = body.status === "maintenance" ? "maintenance" : body.status === "available" ? "available" : null;
  if (!name || name.length > 80 || spec.length > 160 || !status) return null;
  return { name, spec, status };
}
