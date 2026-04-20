import { NextResponse } from "next/server";
import { artists } from "@/lib/data/artists";

export async function GET() {
  return NextResponse.json(artists);
}
