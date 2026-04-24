import { prisma } from "./db";

/** Read or create the singleton settings row. */
export async function getSettings() {
  const existing = await prisma.settings.findUnique({ where: { id: "default" } });
  if (existing) return existing;
  return prisma.settings.create({ data: { id: "default" } });
}
