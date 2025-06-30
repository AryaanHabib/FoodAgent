// src/hooks/useChat.js
import { useState, useEffect, useRef } from "react";
import OpenAI from "openai";
import {
  greetingMemoryPrompt,
  freshSuggestionsPrompt,
  serviceTypePrompt,
  restaurantSuggestionsPrompt,
  orderDetailsPrompt     // ← imported here
} from "../prompts/systemPrompt";
import { chatWithAgent } from "../api/openai.js";

const API_BASE = "http://localhost:3001/api";

export function useChat() {
  const pageRef            = useRef(0)
  const allRestaurantsRef  = useRef([])
  // — Full & slim JSON‐extractor prompts
  const fullExtractorPrompt = `
You are a JSON extractor. Given a user’s message, return EXACTLY a JSON object with these keys:
  - "cuisine": the name of any cuisine or dish the user is actively requesting or positively expressing a desire for; otherwise null.
  - "mood": a short adjective or phrase capturing the user’s emotional state; otherwise null.
  - "occasion": a short phrase for the situation or reason for the meal; otherwise null.
  - "serviceType": one of "delivery", "pickup", or "dine-in" if the user explicitly mentions wanting that; otherwise null.

Rules:
1. Only fill “cuisine” if the user asks for, requests, or expresses a positive desire for a specific dish or cuisine.  
2. If the user merely mentions a dish (e.g. “never recommend salad to me”) or expresses dislike/rejection, “cuisine” must be null.  
3. Do not hardcode any specific foods—apply rule #1 and #2 generally.  
4. Do not output any text besides the JSON object.

`.trim();

  const slimExtractorPrompt = `
You are a JSON extractor. Given a user’s message, return EXACTLY a JSON object with:
  - "cuisine": the name of any cuisine or dish the user is actively requesting or positively expressing a desire for; otherwise null.

  - "mood": a short adjective or phrase capturing the user’s emotional state; otherwise null.
  - "occasion": a short phrase for the situation or reason for the meal; otherwise null.
  - "serviceType": one of "delivery", "pickup", or "dine-in" if the user explicitly mentions wanting that; otherwise null.
Respond with only the JSON object—no extra text.
`.trim();

  // — OpenAI client
  const extractor = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });

  // — State & refs
  const userId = useRef(
      localStorage.getItem("foodAgentUserId") || crypto.randomUUID()
  ).current;

  const [memory, setMemory]                 = useState(null);
  const [messages, setMessages]             = useState([]);
  const [loading, setLoading]               = useState(false);
  const [askedService, setAskedService]     = useState(false);
  const [suggestionsShown, setSuggestionsShown] = useState(false);

  const [restaurantOptions, setRestaurantOptions]   = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const fullOptionsRef = useRef([]);

  // — Persist helper
  async function persistMemory(updates) {
    try {
      await fetch(`${API_BASE}/user/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...updates, timestamp: new Date().toISOString() }),
      });
    } catch (e) {
      console.error("Persist error:", e);
    }
  }

  // — Load memory once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/user/${userId}`);
        setMemory(res.ok ? await res.json() : {});
      } catch {
        setMemory({});
      }
      localStorage.setItem("foodAgentUserId", userId);
    })();
  }, [userId]);

  // — Initial greeting
  useEffect(() => {
    if (!memory || messages.length) return;
    (async () => {
      setLoading(true);
      const hr  = new Date().getHours();
      const tod = hr < 12 ? "morning" : hr < 17 ? "afternoon" : "evening";
      let ctx = `Context — timeOfDay: ${tod}.`;
      if (memory.lastOrder) ctx += ` lastOrder: ${memory.lastOrder}.`;
      if (memory.cuisine)   ctx += ` favoriteCuisine: ${memory.cuisine}.`;
      if (memory.mood)      ctx += ` mood: ${memory.mood}.`;
      if (memory.occasion)  ctx += ` occasion: ${memory.occasion}.`;

      const prompt = memory.cuisine
          ? `${ctx}\n\n${greetingMemoryPrompt}`
          : `${ctx}\n\n${freshSuggestionsPrompt}`;

      const aiMsg = await chatWithAgent([], prompt);
      setMessages([aiMsg]);
      setLoading(false);
    })();
  }, [memory]);

  // — Helper: ask service type
  async function askServiceType(cuisine, history) {
    setAskedService(true);
    setLoading(true);
    const prompt = serviceTypePrompt.replace("{cuisine}", cuisine);
    const svcMsg = await chatWithAgent(history, prompt);
    setMessages(ms => [...ms, svcMsg]);
    setLoading(false);
  }

  // — Helper: choose a new cuisine (orderDetails)
  async function normal(history) {
    setAskedService(false);
    setLoading(true);
    const msg = await chatWithAgent(history, orderDetailsPrompt);
    setMessages(ms => [...ms, msg]);
    setLoading(false);
  }

  // — Hand off to final links
  async function selectRestaurant(idx) {
    const picked = fullOptionsRef.current[idx];
    setSelectedRestaurant(picked.name);
    await persistMemory({ selectedRestaurant: picked.name });
    const linkMsg = {
      role: "assistant",
      content: `Great choice—**${picked.name}** it is! 😊`,
      buttons: [
        {
          label: "Order on Uber Eats",
          url: `https://www.ubereats.com/ca/feed?diningMode=DELIVERY`,
          style: "primary"
        },
        {
          label: "Order with Boons",
          url: "https://www.boons.io/order",
          style: "primary"
        }
      ]
    };
    setMessages(ms => [...ms, linkMsg]);


  }

  // First, add a helper that uses the same extractor to classify the reply:
  async function classifyAffirmation(text) {
    const resp = await extractor.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a JSON classifier.  Given exactly one user reply, return EXACTLY a JSON object with:
  "intent": either "affirm" if the user is agreeing/confirming,
             or "deny" if the user is refusing/rejecting.
Respond with ONLY the JSON object—no extra text.
`.trim()
        },
        { role: "user", content: text }
      ],
      temperature: 0,
      max_tokens: 10
    });

    // extract JSON
    const raw = resp.choices[0].message.content.match(/\{[\s\S]*\}/)?.[0] || "{}";
    const { intent } = JSON.parse(raw);
    return intent;  // "affirm" or "deny"
  }

  async function classifyRestaurantReply(text) {
    const resp = await extractor.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a JSON classifier. The user has just been shown three restaurants and you need to interpret their reply.

Return EXACTLY a JSON object with:
  "action": one of "pick", "more", or "change"
  - "pick" if they are selecting one of the shown restaurants
  - "more" if they want to see more options.
  - "change" if they want to pick a different cuisine/flow

If "pick", also include:
  "selection": either the 1-based index (1,2,3) or the exact restaurant name they gave.

Respond with ONLY the JSON object—no extra text.
        `.trim()
        },
        { role: "user", content: text }
      ],
      temperature: 0,
      max_tokens: 60
    });

    const raw = resp.choices[0].message.content.match(/\{[\s\S]*\}/)?.[0] || "{}";
    return JSON.parse(raw);
  }

  /**
   * Wipe out all in-memory state + persist clearing cuisine & serviceType,
   * then restart with the orderDetails prompt.
   */
  async function resetAllAndRestart(history) {
    // Clear persistent memory slots
    await setMemory(m => ({
      ...m,
      serviceType: null,
    }));
    await persistMemory({ cuisine: null, serviceType: null });

    // Reset local flags & refs
    setAskedService(false);
    setSuggestionsShown(false);
    allRestaurantsRef.current = [];
    fullOptionsRef.current     = [];
    pageRef.current           = 0;
    setRestaurantOptions([]);
    setSelectedRestaurant(null);

    // Kick back into the cuisine selection flow
    return normal(history);
  }
  async function classifyChangeOfMind(text) {
    const resp = await extractor.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a JSON classifier.  The user may say something that indicates they want to restart the ordering flow 
– e.g. changing their mind, not ready to order, etc.

Return EXACTLY a JSON object with:
  { "changeMind": true } if they are asking to start over
  { "changeMind": false } otherwise

Respond with ONLY the JSON object—no extra text.
        `.trim()
        },
        { role: "user", content: text }
      ],
      temperature: 0,
      max_tokens: 10
    });
    const raw = resp.choices[0].message.content.match(/\{[\s\S]*\}/)?.[0] || "{}";
    const { changeMind } = JSON.parse(raw);
    return Boolean(changeMind);
  }

  // — Main sendMessage
  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text };
    setMessages(ms => [...ms, userMsg]);
    const wantsReset = await classifyChangeOfMind(text);
    setLoading(false);
    if (wantsReset) {
      return resetAllAndRestart([...messages, userMsg]);
    }


    // — “Yes” to favorite‐cuisine greeting
    const lc = text.trim().toLowerCase();
    if (messages.length === 1 && memory?.cuisine) {
      // Let the LLM tell us if user affirmed or denied
      setLoading(true);
      const intent = await classifyAffirmation(text);
      console.log(intent);
      setLoading(false);
      if (intent === "affirm") {
        // they want their favorite cuisine again
        await setMemory(m => ({ ...m, cuisine: memory.cuisine }));
        return askServiceType(memory.cuisine, [...messages, userMsg]);
      }
      if (intent === "deny") {
        // they want something new
        await setMemory(m => ({ ...m, cuisine: null }));
        return normal([...messages, userMsg]);
      }
      // If the model returned something unexpected, fall through to normal logic
    }


    // — Slot‐extract
    let cuisine     = null;
    let mood        = null;
    let occasion    = null;
    let serviceType = null;
    const useSlim   = Boolean(memory?.cuisine && askedService);
    const prompt    = useSlim ? slimExtractorPrompt : fullExtractorPrompt;

    try {
      const resp = await extractor.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user",   content: text }
        ],
        temperature: 0,
        max_tokens: 60,
      });
      const js  = resp.choices[0].message.content.match(/\{[\s\S]*\}/)?.[0] || "{}";
      const obj = JSON.parse(js);
      cuisine     = obj.cuisine     || null;
      mood        = obj.mood        || null;
      occasion    = obj.occasion    || null;
      serviceType = obj.serviceType || null;
    } catch (e) {
      console.error("Slot extraction failed:", e);
    }

    // — If cuisine changed mid‐flow, reset
    if (cuisine && cuisine !== memory?.cuisine) {
      setAskedService(false);
      setSuggestionsShown(false);
      fullOptionsRef.current = [];
      setRestaurantOptions([]);
      setSelectedRestaurant(null);
    }

    // — Persist
    const updates = { lastMessage: text };
    if (cuisine)     updates.cuisine     = cuisine;
    if (mood)        updates.mood        = mood;
    if (occasion)    updates.occasion    = occasion;
    if (serviceType) updates.serviceType = serviceType;
    setMemory(m => ({ ...m, ...updates }));
    await persistMemory(updates);

    // — Ask service type if we now have cuisine but no service
    const curCuisine = cuisine || memory?.cuisine;
    const curService = serviceType || memory?.serviceType;
    if (curCuisine && !curService && !askedService) {
      return askServiceType(curCuisine, [...messages, userMsg]);
    }

    if (cuisine && cuisine !== memory?.cuisine) {
      setAskedService(false);
      setSuggestionsShown(false);
      fullOptionsRef.current = [];
      setRestaurantOptions([]);
      setSelectedRestaurant(null);
      setMemory(m => ({ ...m, cuisine }));
      await persistMemory({ cuisine });
      return askServiceType(cuisine, [...messages, userMsg]);
    }


    // — “change of mind”: user just named a brand-new cuisine

    console.log("cuisine: "+ curCuisine);
    console.log("serviceType: "+curService)
    console.log("!suggestionsShown: "+ !suggestionsShown)

    // — Both confirmed → call restaurants API
    if (curCuisine && curService && !suggestionsShown) {
      setSuggestionsShown(true);
      setLoading(true);
      try {
        const pos = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej)
        );
        const { latitude, longitude } = pos.coords;
        const res = await fetch(
            `${API_BASE}/restaurants?lat=${latitude}&lon=${longitude}` +
            `&cuisine=${encodeURIComponent(curCuisine)}`
        );
        const list = await res.json();
        allRestaurantsRef.current = list;           // stash full list
        pageRef.current = 0;                        // reset page

        const firstBatch = list.slice(0, 3);
        fullOptionsRef.current = firstBatch;
        const minimalOptions = firstBatch.map(r => ({
          name:   r.name,
          rating: r.rating,
          eta:    r.eta
        }));
        setRestaurantOptions(minimalOptions);
        await persistMemory({ restaurantOptions: minimalOptions });

        const listText  = firstBatch.map(r=>
            `- ${r.name} (${r.rating}★, `+
            (curService==="delivery"
                    ? `${r.eta} min delivery`
                    : curService==="pickup"
                        ? `${r.eta} min pickup`
                        : `reserve: ${r.reservationLink||r.slug}`
            )+`)`
        ).join("\n");


        const sumPrompt = restaurantSuggestionsPrompt
            .replace("{cuisine}", curCuisine)
            .replace("{serviceType}", curService);

        const sugMsg = await chatWithAgent(
            [{ role:"user", content:listText }],
            sumPrompt
        );
        setMessages(ms=>[...ms,sugMsg]);

      } catch(e) {
        console.error("restaurants API failed:", e);
      } finally {
        setLoading(false);
      }
      return;
    }

    // — Pick a restaurant
    if (suggestionsShown && !selectedRestaurant) {

      setLoading(true);
      let decision;
      try {
        decision = await classifyRestaurantReply(text);
      } catch (e) {
        console.error("Choice classification failed:", e);
      } finally {
        setLoading(false);
      }

      switch (decision.action) {
        case "change":
          return normal([...messages, userMsg]);
        case "more":

          setSuggestionsShown(true);
          setLoading(true);
          try {
            // advance to the next page of 3
            pageRef.current++;
            const start = pageRef.current * 3;
            const next3 = allRestaurantsRef.current.slice(start, start + 3);

            if (!next3.length) {
              // no more
              setMessages(ms => [
                ...ms,
                { role:"assistant", content:"That’s all I’ve got for now—no more spots!" }
              ]);
              return;
            }
            fullOptionsRef.current = next3;
            const mini = next3.map(r=>({
              name:r.name, rating:r.rating, eta:r.eta
            }));
            setRestaurantOptions(mini);
            await persistMemory({ restaurantOptions: mini });

            const listText  = next3.map(r=>
                `- ${r.name} (${r.rating}★, `+
                (curService==="delivery"
                        ? `${r.eta} min delivery`
                        : curService==="pickup"
                            ? `${r.eta} min pickup`
                            : `reserve: ${r.reservationLink||r.slug}`
                )+`)`
            ).join("\n");
            const sumPrompt = restaurantSuggestionsPrompt
                .replace("{cuisine}", curCuisine)
                .replace("{serviceType}", curService);

            const sugMsg = await chatWithAgent(
                [{ role:"user", content:listText }],
                sumPrompt
            );
            setMessages(ms=>[...ms,sugMsg]);

          } catch (e) {
            console.error("Fetch more restaurants failed:", e);
            setMessages(ms => [
              ...ms,
              { role: "assistant", content: `Sorry, I couldn't load more options right now.` }
            ]);
          } finally {
            setLoading(false);
          }
          return;
        case "pick":
          // either a numeric pick or a name
          const sel = decision.selection;
          let idx = null;
          if (typeof sel === "number") {
            idx = sel - 1;
          } else {
            idx = fullOptionsRef.current.findIndex(r =>
                r.name.toLowerCase() === sel.toLowerCase()
            );
          }
          if (idx >= 0) return selectRestaurant(idx);

          // fallthrough to “didn't catch that”
          break;

        default:

          break;
      }



      //If they clicked one of the provided buttons (we assume value === the name)
      const idxByName = restaurantOptions.findIndex(
          b => b.value.toLowerCase() === lc
      );
      if (idxByName >= 0) {
        return selectRestaurant(idxByName);
      }

      setMessages(ms => [
        ...ms,
        {
          role: "assistant",
          content: `Oops, I didn't catch that. Please pick one of the buttons above, or say “more” to see more options, or “change my mind” to try something else.`
        }
      ]);
      return;
    }

    // — Fallback
    setLoading(true);
    try {
      const aiMsg = await chatWithAgent([...messages, userMsg]);
      setMessages(ms=>[...ms, aiMsg]);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return {
    messages,
    sendMessage,
    loading,
    restaurantOptions,
    selectedRestaurant,
    selectRestaurant
  };
}
