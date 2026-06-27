import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data, error } = await supabase.from("case_responses").insert({
      case_id: params.id,
      responder_user_id: body.responder_id,
      status: "claimed",
    }).select("*").single();

    if (error) throw error;

    if (body.responder_id) {
      await supabase.from("users").update({ is_available: true }).eq("id", body.responder_id);
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, message: (err as Error).message }, { status: 500 });
  }
}
