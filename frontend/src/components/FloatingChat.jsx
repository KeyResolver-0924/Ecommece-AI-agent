import React from "react";
import './FloatingChat.css'; // Import the CSS file
import ChatBot from "./ChatBot"; // Ensure the path is correct based on your project structure

const FloatingChat = () => {
  return (
    <div className="floating-chat-container">
      <div className="chat-window">
        <ChatBot />
      </div>
      <div className="chat-icon">
        💬
      </div>
    </div>
  );
};

export default FloatingChat;
