export abstract class UnassignMemberUseCase {
  abstract execute(assignmentId: number, taskId: number): Promise<void>;
}
