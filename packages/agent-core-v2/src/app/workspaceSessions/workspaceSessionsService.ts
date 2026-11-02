import { LifecycleScope } from '#/app/scopes';

import { ScopeActivation, registerScopedService } from '#/_base/di/scope';
import { ISessionIndex, type SessionSummary } from '#/app/sessionIndex/sessionIndex';
import { IWorkspaceAliases } from '#/app/workspaceAliases/workspaceAliases';

import { IWorkspaceSessions, RECENT_SESSIONS_LIMIT } from './workspaceSessions';

export class WorkspaceSessionsService implements IWorkspaceSessions {
  declare readonly _serviceBrand: undefined;

  constructor(
    @IWorkspaceAliases private readonly aliases: IWorkspaceAliases,
    @ISessionIndex private readonly index: ISessionIndex,
  ) {}

  async listRecent(workspaceId: string): Promise<readonly SessionSummary[]> {
    const workspaceIds = await this.aliases.resolveAliasIds(workspaceId);
    const page = await this.index.listRecent({ workspaceIds, limit: RECENT_SESSIONS_LIMIT });
    return page.items;
  }

  async count(workspaceId: string): Promise<number> {
    const workspaceIds = await this.aliases.resolveAliasIds(workspaceId);
    return this.index.count({ workspaceIds, includeArchived: true });
  }

  async countByWorkspace(): Promise<ReadonlyMap<string, number>> {
    const counts = await this.index.countByWorkspace({ includeArchived: true });
    const totals = new Map<string, number>();
    const visited = new Set<string>();
    for (const [workspaceId, count] of counts) {
      if (visited.has(workspaceId)) continue;
      const aliases = await this.aliases.resolveAliasIds(workspaceId);
      let total = count;
      for (const alias of aliases) {
        if (alias === workspaceId) continue;
        const aliasCount = counts.get(alias);
        if (aliasCount !== undefined) total += aliasCount;
      }
      for (const alias of aliases) {
        visited.add(alias);
        totals.set(alias, total);
      }
    }
    return totals;
  }
}

registerScopedService(
  LifecycleScope.App,
  IWorkspaceSessions,
  WorkspaceSessionsService,
  ScopeActivation.OnScopeCreated,
  'workspaceSessions',
);
