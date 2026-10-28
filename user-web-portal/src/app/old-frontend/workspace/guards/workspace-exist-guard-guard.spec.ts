import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { workspaceExistGuardGuard } from './workspace-exist-guard-guard';

describe('workspaceExistGuardGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => TestBed.runInInjectionContext(() => workspaceExistGuardGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
