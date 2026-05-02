import Groq from "groq-sdk";

const apiKey = process.env.GROQ_API_KEY;

const groq = apiKey ? new Groq({ apiKey }) : null;

export async function generateChatReply(messages: { role: "user" | "assistant"; content: string }[]) {
  if (!groq) {
    console.warn("Groq AI: No API key provided, skipping suggestion.");
    return "";
  }
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for Bookora, a booking platform. Suggest a concise, professional, and friendly reply based on the recent conversation. Keep it under 20 words.",
        },
        ...messages,
      ],
      model: "llama3-8b-8192",
    });

    return completion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error("Groq AI Error:", error);
    return "";
  }
}
