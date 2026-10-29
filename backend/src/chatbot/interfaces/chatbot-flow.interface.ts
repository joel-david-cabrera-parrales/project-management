export type ChatbotInputType = 'text' | 'choice' | 'confirmation';

export type ChatbotUserData = Record<string, unknown>;

export interface ChatbotInputPrompt {
  type: ChatbotInputType;
  required: boolean;
  options?: string[];
}

export interface ChatbotTransition {
  event: 'VALID' | 'SELECT' | 'CONFIRM' | 'CANCEL' | 'RESTART';
  value?: string;
  target: string;
  action?: string;
}

export interface ChatbotState {
  message: string | string[];
  taskCardsFrom?: string;
  listItemsFrom?: string;
  input?: {
    type: ChatbotInputType;
    saveAs?: string;
    required?: boolean;
    options?: string[];
  };
  transitions?: ChatbotTransition[];
  terminal?: boolean;
}

export interface ChatbotFlow {
  id: string;
  name: string;
  initialState: string;
  states: Record<string, ChatbotState>;
}
