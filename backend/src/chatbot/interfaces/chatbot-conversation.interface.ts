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

export type ChatbotListItemKind = 'workspace' | 'task-list' | 'task' | 'member';

export interface ChatbotListItem {
  id: string;
  value: string;
  kind: ChatbotListItemKind;
  title: string;
  subtitle?: string;
  detail?: string;
}
