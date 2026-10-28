import { TestBed } from '@angular/core/testing';
import { WorkspaceListApiService } from '../data-access/workspace-list-api.service';
import { WorkspaceListItem } from '../models/workspace-list.models';
import { WorkspaceListStore } from './workspace-list.store';

function workspace(code: string, name: string, status: 1 | 2 | 3): WorkspaceListItem {
  return {
    code,
    name,
    initials: name.slice(0, 2).toUpperCase(),
    description: `${name} description`,
    color: '#2563eb',
    status,
    boardCount: 1,
    memberCount: 2,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };
}

describe('WorkspaceListStore', () => {
  let store: WorkspaceListStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorkspaceListStore,
        { provide: WorkspaceListApiService, useValue: { getWorkspaces: vi.fn(), createWorkspace: vi.fn() } },
      ],
    });
    store = TestBed.inject(WorkspaceListStore);
  });

  it('groups active, closed, and archived workspaces by status', () => {
    store.workspaces.set([
      workspace('active-1', 'Active project', 1),
      workspace('closed-1', 'Closed project', 2),
      workspace('archived-1', 'Archived project', 3),
    ]);

    expect(store.activeWorkspaces().map((item) => item.code)).toEqual(['active-1']);
    expect(store.closedWorkspaces().map((item) => item.code)).toEqual(['closed-1']);
    expect(store.archivedWorkspaces().map((item) => item.code)).toEqual(['archived-1']);
    expect(store.showClosed()).toBe(false);
    expect(store.showArchived()).toBe(false);
  });

  it('searches only active workspaces by name and description', () => {
    store.workspaces.set([
      workspace('active-1', 'Product launch', 1),
      workspace('active-2', 'Operations', 1),
      workspace('closed-1', 'Product archive', 2),
    ]);
    store.searchQuery.set('PRODUCT');

    expect(store.filteredActiveWorkspaces().map((item) => item.code)).toEqual(['active-1']);
  });

  it('returns all active workspaces when the search is empty', () => {
    store.workspaces.set([
      workspace('active-1', 'Product launch', 1),
      workspace('active-2', 'Operations', 1),
      workspace('closed-1', 'Closed project', 2),
    ]);

    expect(store.filteredActiveWorkspaces().map((item) => item.code)).toEqual(['active-1', 'active-2']);
  });
});
