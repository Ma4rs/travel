import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("photo") as File | null;
  const questId = formData.get("questId") as string | null;

  if (!file || !questId) {
    return NextResponse.json(
      { error: "Missing photo or questId" },
      { status: 400 }
    );
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  const filePath = `${user.id}/${questId}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("quest-photos")
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Upload failed: " + uploadError.message },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("quest-photos").getPublicUrl(filePath);

  return NextResponse.json({ photoUrl: publicUrl });
}
