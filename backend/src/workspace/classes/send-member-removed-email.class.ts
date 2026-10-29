export abstract class SendMemberRemovedEmailUseCase {
  abstract execute(memberId: number, removedByUserId?: number): Promise<void>;
}
