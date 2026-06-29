/**
 * @agent-os/workflow
 *
 * Workflow and DAG type contracts. Phase 1.1 skeletons only.
 */

import type { Identifier } from '@agent-os/core';

export const PACKAGE_NAME = '@agent-os/workflow' as const;
export const PACKAGE_VERSION = '0.1.0' as const;

export type WorkflowId = Identifier<'WorkflowId'>;
export type WorkflowStepId = Identifier<'WorkflowStepId'>;

export interface WorkflowDefinition {
  readonly id: WorkflowId;
  readonly name: string;
  readonly version: string;
}

export interface WorkflowStep {
  readonly id: WorkflowStepId;
  readonly name: string;
  readonly dependsOn: readonly WorkflowStepId[];
}
