import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Unknown org resource" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Unknown org resource" }, { status: 404 });
}

export async function PATCH() {
  return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Unknown org resource" }, { status: 404 });
}

export async function DELETE() {
  return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Unknown org resource" }, { status: 404 });
}