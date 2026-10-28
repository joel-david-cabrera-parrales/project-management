export interface CreateTask {
  title: string;
  description: string;
  dateInit?: string;
  dateEnd?: string;
  position: number;

  taskListId: number;
  workspaceCode: string;
  boardCode: string;
}
