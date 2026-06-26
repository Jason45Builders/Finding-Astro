import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Route not found" }, { status: 404 });
}

export function POST() {
  return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Route not found" }, { status: 404 });
}

export function PATCH() {
  return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Route not found" }, { status: 404 });
}

export function DELETE() {
  return NextResponse.json({ success: false, code: "NOT_FOUND", message: "Route not found" }, { status: 404 });
}
