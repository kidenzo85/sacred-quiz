import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, voice, speed, pitch } = await req.json();
    const API_KEY = Deno.env.get("GOOGLE_CLOUD_TTS_API_KEY");
    if (!API_KEY) throw new Error("GOOGLE_CLOUD_TTS_API_KEY not configured");

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "fr-FR", name: voice || "fr-FR-Neural2-A" },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: speed || 1.0,
            pitch: pitch || 0,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Google TTS error:", response.status, err);
      throw new Error(`Google TTS error: ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify({ audioContent: data.audioContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("TTS error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
