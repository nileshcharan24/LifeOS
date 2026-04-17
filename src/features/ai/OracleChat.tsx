"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { askOracle } from "@/services/ai/aiService";
import { toast } from "sonner";

export function OracleChat() {
  const [messages, setMessages] = useState<{ role: "user" | "oracle"; text: string }[]>([
    { role: "oracle", text: "I am the Oracle. What guidance do you seek today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await askOracle(userMsg);
      if (response.success && response.text) {
        setMessages((prev) => [...prev, { role: "oracle", text: response.text }]);
      } else {
        toast.error(response.error || "Oracle failed to respond.");
      }
    } catch (error) {
      toast.error("Oracle connection interrupted.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[400px] flex-col rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden">
      <div className="bg-muted px-4 py-3 border-b border-border/40">
        <h2 className="font-semibold tracking-tight">The AI Oracle</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl px-4 py-2 text-sm bg-muted text-foreground animate-pulse">
              The Oracle is pondering...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-border/40 flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Ask the Oracle..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
