import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, count } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es un expert en religions du monde. Génère exactement ${count || 5} questions à choix multiples (QCM) sur le thème religieux${category ? ` en te concentrant sur : ${category}` : ""}.

Chaque question doit :
- Être en français
- Avoir exactement 4 options de réponse
- Avoir une seule bonne réponse
- Inclure une explication courte de la bonne réponse
- Couvrir des sujets variés : prophètes, textes sacrés, rituels, histoire, commandements, fêtes, lieux saints

IMPORTANT : Retourne les questions en utilisant le tool "generate_questions".`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Génère ${count || 5} questions QCM religieuses${category ? ` sur le thème: ${category}` : " variées"}.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_questions",
              description: "Retourne les questions QCM générées",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string", description: "La question" },
                        options: {
                          type: "array",
                          items: { type: "string" },
                          description: "4 options de réponse",
                        },
                        correctIndex: {
                          type: "number",
                          description: "Index (0-3) de la bonne réponse",
                        },
                        explanation: {
                          type: "string",
                          description: "Explication courte de la bonne réponse",
                        },
                        category: {
                          type: "string",
                          description: "Catégorie de la question",
                        },
                      },
                      required: ["question", "options", "correctIndex", "explanation", "category"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_questions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer dans quelques instants." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const questions = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(questions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
