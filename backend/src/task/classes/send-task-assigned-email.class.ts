export abstract class SendTaskAssignedEmailUseCase {
  abstract execute(workspaceMemberId: number, taskId: number, assignedByUserId?: number): Promise<void>;
}
