import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { count, category, model } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get categories from DB
    const { data: cats } = await supabase.from("categories").select("id, name").eq("is_active", true);
    const catMap = new Map((cats || []).map((c: any) => [c.name, c.id]));
    const catNames = (cats || []).map((c: any) => c.name).join(", ");

    const aiModel = model || "google/gemini-2.5-flash-lite";
    const questionCount = Math.min(count || 20, 50);

    const systemPrompt = `Tu es un expert en théologie chrétienne et en études bibliques. Génère exactement ${questionCount} questions à choix multiples (QCM) exclusivement basées sur la Bible.

${category ? `Concentre-toi sur le thème: ${category}` : `Répartis les questions parmi ces catégories: ${catNames}`}

Chaque question doit :
- Être en français
- Porter UNIQUEMENT sur la Bible chrétienne
- Avoir exactement 4 options de réponse
- Avoir une seule bonne réponse
- Inclure une explication avec la référence biblique
- Varier en difficulté (facile, moyen, difficile)

IMPORTANT : Retourne les questions en utilisant le tool "generate_questions".`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Génère ${questionCount} questions QCM bibliques variées.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_questions",
            description: "Retourne les questions QCM",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: { type: "array", items: { type: "string" } },
                      correctIndex: { type: "number" },
                      explanation: { type: "string" },
                      category: { type: "string" },
                      difficulty: { type: "string", enum: ["facile", "moyen", "difficile"] },
                    },
                    required: ["question", "options", "correctIndex", "explanation", "category", "difficulty"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez plus tard." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const { questions } = JSON.parse(toolCall.function.arguments);

    // Store in database
    const rows = questions.map((q: any) => ({
      question: q.question,
      options: q.options,
      correct_index: q.correctIndex,
      explanation: q.explanation,
      category_id: catMap.get(q.category) || null,
      difficulty: q.difficulty || "medium",
      source: "ai",
      ai_model: aiModel,
    }));

    const { data: inserted, error: insertError } = await supabase.from("quiz_questions").insert(rows).select("id");
    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to store questions");
    }

    return new Response(JSON.stringify({ stored: inserted?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-and-store error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
