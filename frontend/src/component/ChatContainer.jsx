// src/components/ChatContainer.jsx
import React from "react";
import { useChat } from "../hooks/useChat";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";

export default function ChatContainer() {
    const {
        messages,
        sendMessage,
        loading,
        restaurantOptions,
        selectedRestaurant,
        selectRestaurant,
    } = useChat();

    // look at the last assistant message for dynamic buttons
    const lastMsg = messages[messages.length - 1];
    const dynButtons = lastMsg?.buttons || [];


    return (
        <div className="flex flex-col h-screen w-screen bg-gray-50">
            {/* Chat messages */}
            <div className="flex-1 overflow-auto bg-white sm:p-6 p-4">
                <MessageList messages={messages} />
            </div>

            {/* Dynamic buttons from last assistant message */}
            {dynButtons.length > 0 && selectedRestaurant && (
                <div className="bg-gray-100 p-4 flex flex-wrap gap-2 overflow-x-auto">
                    {dynButtons.map((btn, i) => {
                        // derive classes from optional btn.style or btn.color
                        const baseClasses =
                            "px-4 py-2 rounded-md shadow focus:outline-none focus:ring-2";
                        const styleClasses =
                            btn.style === "primary"
                                ? "bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-300"
                                : btn.style === "secondary"
                                    ? "bg-gray-300 text-gray-800 hover:bg-gray-400 focus:ring-gray-200"
                                    : "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400";

                        return btn.url ? (
                            <a
                                key={i}
                                href={btn.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${baseClasses} ${styleClasses}`}
                            >
                                {btn.label}
                            </a>
                        ) : (
                            <button
                                key={i}
                                onClick={() => selectRestaurant(i)}
                                className={`${baseClasses} ${styleClasses}`}
                            >
                                {btn.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Fallback: numbered restaurantOptions buttons */}
            {!dynButtons.length && restaurantOptions.length > 0 && !selectedRestaurant && (
                <div className="bg-gray-100 p-4 flex flex-wrap gap-2 overflow-x-auto">
                    {restaurantOptions.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => selectRestaurant(idx)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            {idx + 1}. {opt.name} ({opt.rating}★, {opt.eta} min)
                        </button>
                    ))}
                </div>
            )}

            {/* Input bar */}
            <div className="border-t border-gray-200 p-4 bg-white">
                <ChatInput onSend={sendMessage} disabled={loading} />
            </div>
        </div>
    );
}
