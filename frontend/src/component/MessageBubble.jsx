import React from "react";

export default function MessageBubble({ role, content }) {
  const isUser = role === "user";

  return (
      <div className={`flex ${isUser ? "justify-end" : "justify-start"} px-2`}>
        <div
            className={[
              "relative max-w-[80%] px-4 py-2 whitespace-pre-wrap break-words rounded-xl",
              isUser
                  ? "bg-orange-500 text-white rounded-br-none shadow-lg shadow-orange-500/50"
                  : "bg-gray-700 text-white rounded-bl-none shadow-md shadow-gray-700/50",
            ].join(" ")}
        >
          {content}
          <span
              className={[
                "absolute bottom-0 w-3 h-3",
                isUser
                    ? "right-0 translate-x-1 border-l-8 border-l-orange-500 border-b-8 border-b-transparent"
                    : "left-0 -translate-x-1 border-r-8 border-r-gray-700 border-t-8 border-t-transparent",
              ].join(" ")}
          />
        </div>
      </div>
  );
}
