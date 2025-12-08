const API_URL = "https://api.deepseek.com/v1/chat/completions"; // keyless endpoint

const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const step3 = document.getElementById("step3");

const rawIdeaEl = document.getElementById("rawIdea");
const questionsContainer = document.getElementById("questionsContainer");
const finalPromptEl = document.getElementById("finalPrompt");
const statusEl = document.getElementById("status");

/* ----------------------------- */
/* Universal AI Call with Retries */
/* ----------------------------- */
async function callDeepSeek(prompt) {
  let attempts = 0;

  while (attempts < 3) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.9
        })
      });

      if (!response.ok) throw new Error("Network error");

      const data = await response.json();
      return data.choices[0].message.content.trim();

    } catch (e) {
      attempts++;
      if (attempts >= 3) return null;
    }
  }
}

/* ----------------------------- */
/* Step 1 → Generate Questions */
/* ----------------------------- */
document.getElementById("analyzeBtn").onclick = async () => {
  const idea = rawIdeaEl.value.trim();
  if (!idea) return;

  statusEl.textContent = "Analyzing idea…";

  const questionPrompt = `
You are an expert prompt engineer.
Given the user's raw idea:

"${idea}"

Generate **exactly 6** deep, vivid, highly-specific refinement questions.
Rules:
- Each question must explore a different dimension (emotion, structure, constraints, creativity, audience, or technicality).
- Avoid generic questions like “What tone do you want?”
- Anchored to the user's idea.
- Each question must meaningfully affect the final prompt.
Format: Numbered list (1–6), no explanations.
`;

  const result = await callDeepSeek(questionPrompt);

  if (!result) {
    statusEl.textContent = "AI busy — try again in 10 seconds.";
    return;
  }

  statusEl.textContent = "";
  step1.classList.add("hidden");
  step2.classList.remove("hidden");

  // split into questions
  const qs = result.split(/\d+\./).filter(x => x.trim() !== "");

  questionsContainer.innerHTML = "";

  qs.forEach((q, i) => {
    const block = document.createElement("div");
    block.innerHTML = `
      <p class="text-white/90 font-semibold mb-1">${i + 1}. ${q.trim()}</p>
      <input id="answer${i}"
        class="w-full p-3 rounded-lg bg-black/40 border border-white/10 focus:border-neon"
        placeholder="Your answer..."/>
    `;
    questionsContainer.appendChild(block);
  });
};

/* ----------------------------- */
/* Step 2 → Generate Final Prompt */
/* ----------------------------- */
document.getElementById("generatePromptBtn").onclick = async () => {
  statusEl.textContent = "Generating optimized prompt…";

  const idea = rawIdeaEl.value.trim();
  const answers = [];

  for (let i = 0; i < 4; i++) {
    answers.push(document.getElementById(`answer${i}`).value.trim());
  }

  const finalPromptInput = `
You are an elite prompt engineer.
Create one perfect optimized prompt that another AI model will use.

STRUCTURE REQUIRED:
A. System Role
B. Task Definition (must preserve: "${idea}")
C. Context Integration (embed these user refinements):
${answers.map((a, i) => `- Answer ${i + 1}: ${a}`).join("\n")}
D. Internal Reasoning Instructions (hidden chain-of-thought; instruct model to think stepwise but NOT reveal steps)
E. Output Format Instructions
F. Optional Few-shot (only if beneficial)

Tone: extremely clear, logically structured, professional.

Return ONLY the final optimized prompt, nothing else.
`;

  const result = await callDeepSeek(finalPromptInput);

  if (!result) {
    statusEl.textContent = "AI busy — try again in 10 seconds.";
    return;
  }

  finalPromptEl.value = result;

  step2.classList.add("hidden");
  step3.classList.remove("hidden");
  statusEl.textContent = "";
};

/* ----------------------------- */
/* Copy + New Buttons */
/* ----------------------------- */

document.getElementById("copyBtn").onclick = () => {
  navigator.clipboard.writeText(finalPromptEl.value);
  statusEl.textContent = "Copied!";
  setTimeout(() => (statusEl.textContent = ""), 1200);
};

document.getElementById("newBtn").onclick = () => {
  location.reload();
};
