import React from "react";

export default function LoadingIndicator() {
    return (
        <div className="flex items-center space-x-1 self-start ml-2">
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="w-2 h-2 bg-green-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 200}ms` }}
                />
            ))}
        </div>
    );
}
