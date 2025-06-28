// src/api/openai.js

import OpenAI from "openai";
import {
    greetingMemoryPrompt
} from "../prompts/systemPrompt";

const openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true, // prototyping only!
});


export async function chatWithAgent(history, overrideSystemPrompt) {
    // By default, use the combined greeting+memory prompt
    const systemContent = overrideSystemPrompt ?? greetingMemoryPrompt ;

    const messages = [
        { role: "system",  content: systemContent },
        ...history,
    ];

    const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 500,
    });

    return resp.choices[0].message;
}
