import { NextResponse } from "next/server";
import { backendMeta } from "@/lib/ai";

export async function GET() {
  const meta = await backendMeta();
  return NextResponse.json(meta);
}
