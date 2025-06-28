import React from "react";
import MessageBubble from "./MessageBubble";

export default function MessageList({ messages }) {
  return (
      <div className="flex flex-col space-y-4">
        {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
      </div>
  );
}
