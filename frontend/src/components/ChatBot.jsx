import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./ChatBot.css";
import ChatProductCard from "./ChatProductCard"; 
const ChatBot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState("");
  const [isTyping, setIsTyping] = useState(false); 
  const messagesEndRef = useRef(null);
  const [recommendations, setRecommendations] = useState([]);
  useEffect(() => {
    let existingUserId = localStorage.getItem("userId");
    if (!existingUserId) {
      existingUserId = `user_${Date.now()}`;
      localStorage.setItem("userId", existingUserId);
    }
    setUserId(existingUserId);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, recommendations]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true); 

    try {
      const response = await axios.post("/api/chat", { message: input, userId });
      const { reply, recommendation } = response.data;
      const botMessage = { sender: "bot", text: reply };
      setMessages((prev) => [...prev, botMessage]);
      if (recommendation) {
        setRecommendations((prev) => [...prev, recommendation]);
      }

    } catch (error) {
      const errorMessage = { sender: "bot", text: "Sorry, an error occurred while sending the message. Please try again later." };
      setMessages((prev) => [...prev, errorMessage]);
    }
    setIsTyping(false); 
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="chatbot-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={msg.sender === "user" ? "userMessage" : "botMessage"}
          >
            <strong>{msg.sender === "user" ? "You" : "AI"}:</strong> {msg.text}
          </div>
        ))}
        {isTyping && (
          <div className="botMessage">
            <strong>AI:</strong> Typing...
          </div>
        )}
        {recommendations.map((product, index) => (
          <ChatProductCard key={index} product={product} />
        ))}
        <div ref={messagesEndRef} /> {/* Auto */}
      </div>
      <div className="inputContainer">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter your message..."
          className="chatInput"
        />
        <button onClick={sendMessage} className="sendButton">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBot;
