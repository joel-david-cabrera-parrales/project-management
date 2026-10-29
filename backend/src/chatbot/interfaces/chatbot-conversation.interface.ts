export interface ChatbotMessage {
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
