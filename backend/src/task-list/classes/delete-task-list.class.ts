export abstract class DeleteTaskListUseCase {
  abstract execute(id: number, userId: number): Promise<void>;
}
