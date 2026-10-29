export interface ChatbotMessage {
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tasks?: ChatbotTaskCard[];
  items?: ChatbotListItem[];
}

export interface ChatbotTaskCard {
  taskCode: string;
  title: string;
  completed: boolean;
  workspaceCode: string;
  workspaceName: string;
  boardCode: string;
  boardName: string;
  taskListName: string;
  dateEnd: string | null;
}

export interface ChatbotListItem {
  id: string;
  value: string;
  kind: 'workspace' | 'task-list' | 'task' | 'member';
  title: string;
  subtitle?: string;
  detail?: string;
}

export interface ChatbotInputPrompt {
  type: 'text' | 'choice' | 'confirmation';
  required: boolean;
  options?: string[];
}

export interface ChatbotConversation {
  id: string;
  flowId: string;
  state: string;
  completed: boolean;
  input: ChatbotInputPrompt | null;
  responses: string[];
  history: ChatbotMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotFlowSummary {
  id: string;
  name: string;
}
