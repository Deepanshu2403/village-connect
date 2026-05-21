import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Send } from "lucide-react";
import { getChat, sendMessage } from "../../api/chatApi";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatShortDateTime } from "../../utils/format";

export default function ChatPage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const bottomRef = useRef(null);
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const fetchChat = useCallback(async () => {
    setError("");
    try {
      const res = await getChat(userId);
      setContact(res.data.contact);
      setMessages(res.data.messages || []);
    } catch {
      setError("Failed to load conversation.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (event) => {
    event.preventDefault();
    const cleanText = text.trim();
    if (!cleanText) return;

    setSending(true);
    try {
      await sendMessage(userId, cleanText);
      setText("");
      await fetchChat();
    } catch {
      addToast("Message could not be sent", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-md">
        <header className="border-b border-gray-100 p-5">
          <p className="text-sm font-semibold text-orange-600">Chat</p>
          <h1 className="text-2xl font-extrabold text-gray-950">
            {contact?.name || "Conversation"}
          </h1>
          {contact?.phone && <p className="text-sm text-gray-500">{contact.phone}</p>}
        </header>

        <section className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {loading ? (
            <div className="grid gap-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-2xl bg-gray-200" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-md">
              <p className="text-5xl">⚠️</p>
              <h2 className="mt-4 text-xl font-extrabold text-gray-950">{error}</h2>
              <button
                type="button"
                onClick={fetchChat}
                className="mt-5 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600"
              >
                Retry
              </button>
            </div>
          ) : messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="text-5xl">💬</p>
                <h2 className="mt-4 text-xl font-extrabold text-gray-950">No messages yet</h2>
                <p className="mt-2 text-gray-500">Send the first message to coordinate the trip.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {messages.map((message) => {
                const mine = message.senderId === user?.id;
                return (
                  <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
                        mine
                          ? "rounded-br-md bg-orange-500 text-white"
                          : "rounded-bl-md bg-white text-gray-900"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm font-medium">{message.text}</p>
                      <p className={`mt-1 text-xs ${mine ? "text-orange-100" : "text-gray-400"}`}>
                        {formatShortDateTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <form onSubmit={handleSend} className="grid grid-cols-[1fr_auto] gap-3 border-t border-gray-100 p-4">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Type your message..."
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{sending ? "Sending..." : "Send"}</span>
          </button>
        </form>
      </div>
    </main>
  );
}
