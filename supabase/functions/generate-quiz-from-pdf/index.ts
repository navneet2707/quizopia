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
    const { pdfText, topic, difficulty, difficulties, quizType, numQuestions } = await req.json();

    const hasPdf = typeof pdfText === "string" && pdfText.trim().length >= 50;
    const hasTopic = typeof topic === "string" && topic.trim().length >= 3;

    if (!hasPdf && !hasTopic) {
      return new Response(
        JSON.stringify({ error: "Provide either a PDF (with extractable text) or a topic (min 3 chars)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const difficultyGuide: Record<string, string> = {
      easy: "simple recall and basic understanding questions. Options should have one clearly correct answer.",
      medium: "application and analysis level questions. Options should be plausible but distinguishable.",
      hard: "evaluation and synthesis level questions. Options should be very close and require deep understanding.",
    };

    // Normalize difficulty inputs: prefer `difficulties` array, fall back to single `difficulty`.
    const allowed = ["easy", "medium", "hard"] as const;
    const rawLevels: string[] = Array.isArray(difficulties) && difficulties.length > 0
      ? difficulties
      : (typeof difficulty === "string" ? [difficulty] : ["medium"]);
    const levels = rawLevels.filter((l) => (allowed as readonly string[]).includes(l));
    const effectiveLevels = levels.length > 0 ? levels : ["medium"];
    const isMix = effectiveLevels.length > 1;

    const questionCount = Math.min(numQuestions || 10, 20);
    const isMultiple = quizType === "multiple";

    const systemPrompt = `You are an expert quiz generator. You MUST respond with ONLY a valid JSON array, no markdown, no explanation, no code blocks. Just the raw JSON array.`;

    const sourceBlock = hasPdf
      ? `TEXT CONTENT:\n${pdfText.slice(0, 15000)}`
      : `TOPIC: ${topic.trim()}\n\nGenerate questions covering important concepts, facts, and applications related to this topic.`;

    const difficultyHeader = isMix
      ? `mixed difficulty (a balanced blend of: ${effectiveLevels.join(", ")})`
      : `${effectiveLevels[0]} difficulty`;

    const difficultyGuideText = isMix
      ? `You MUST distribute the ${questionCount} questions roughly evenly across these levels: ${effectiveLevels.join(", ")}.\n` +
        effectiveLevels.map((l) => `- ${l}: ${difficultyGuide[l]}`).join("\n")
      : `Difficulty guide: ${difficultyGuide[effectiveLevels[0]]}`;

    const userPrompt = `Generate exactly ${questionCount} ${difficultyHeader} quiz questions ${hasPdf ? "from the following text" : "about the following topic"}.

${difficultyGuideText}

${isMultiple ? "Each question should have MULTIPLE correct answers (2-3 correct out of 4 options)." : "Each question should have exactly ONE correct answer."}

CODE FORMATTING RULES (very important):
- If a question or any option includes source code, code snippets, commands, or program output, wrap it using markdown code fences.
- Use triple backticks with a language hint for multi-line code, e.g. \`\`\`python\\nprint("hi")\\n\`\`\` or \`\`\`javascript\\n...\\n\`\`\`.
- Use single backticks for short inline identifiers like \`variableName\` or \`int\`.
- Preserve indentation and line breaks (use \\n inside the JSON string). Do not mix prose inside fences — put prose before/after the fenced block.

Return a JSON array where each element has:
- "text": the question text (with code fenced as described above when applicable)
- "optionA": first option
- "optionB": second option  
- "optionC": third option
- "optionD": fourth option
${isMultiple
  ? '- "correctOptions": array of correct option letters like ["A","C"]'
  : '- "correctOption": single correct option letter like "A"'
}

${sourceBlock}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    let questions;
    try {
      questions = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "AI returned invalid format. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(questions)) {
      return new Response(
        JSON.stringify({ error: "AI returned unexpected format. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz-from-pdf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
