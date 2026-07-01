/**
 * Graphiti execution event writer.
 *
 * Subscribes to Hermes execution events and writes them to the
 * knowledge graph. This creates the bridge between the execution
 * engine and the knowledge graph for Mission Control visualization.
 *
 * Layer: 4 (Application)
 */

import type { GraphitiProvider, GraphNodeId } from '@agent-os/graphiti';
import type { ExecutionEvent } from '../execution/ExecutionTypes.js';

// ---------------------------------------------------------------------------
// Event writer
// ---------------------------------------------------------------------------

/**
 * Writes execution events to the Graphiti knowledge graph.
 * Each execution creates nodes for goals, plans, steps, and edges
 * for their relationships.
 */
export class GraphitiEventWriter {
  private readonly graph: GraphitiProvider;

  public constructor(graph: GraphitiProvider) {
    this.graph = graph;
  }

  /**
   * Process a single execution event and write to the graph.
   */
  public handleEvent(event: ExecutionEvent): void {
    switch (event.type) {
      case 'ExecutionStarted':
        this.handleExecutionStarted(event);
        break;
      case 'ExecutionCompleted':
        this.handleExecutionCompleted(event);
        break;
      case 'ExecutionFailed':
        this.handleExecutionFailed(event);
        break;
      case 'StepStarted':
        this.handleStepStarted(event);
        break;
      case 'StepCompleted':
        this.handleStepCompleted(event);
        break;
      case 'StepFailed':
        this.handleStepFailed(event);
        break;
      case 'RetryStarted':
        this.handleRetryStarted(event);
        break;
      case 'RetryCompleted':
        this.handleRetryCompleted(event);
        break;
      case 'CheckpointCreated':
        this.handleCheckpointCreated(event);
        break;
      default:
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  private handleExecutionStarted(event: ExecutionEvent & { type: 'ExecutionStarted' }): void {
    const goalId = `goal-${event.goalId}`;
    const planId = `plan-${event.planId}`;
    const executionId = `exec-${event.executionId}`;

    // Ensure goal node exists
    if (!this.graph.getNode(goalId)) {
      this.graph.addNode({
        id: goalId,
        type: 'goal',
        label: event.goal,
        properties: { goalId: event.goalId },
      });
    }

    // Ensure plan node exists
    if (!this.graph.getNode(planId)) {
      this.graph.addNode({
        id: planId,
        type: 'plan',
        label: `Plan ${event.planId}`,
        properties: { planId: event.planId, stepCount: event.stepCount },
      });
    }

    // Create execution node
    this.graph.addNode({
      id: executionId,
      type: 'execution',
      label: `Execution ${event.executionId.slice(0, 8)}`,
      properties: {
        executionId: event.executionId,
        goal: event.goal,
        status: 'running',
        sessionId: event.sessionId,
        correlationId: event.correlationId,
        stepCount: event.stepCount,
      },
    });

    // Create edges
    this.ensureEdge(`edge-${executionId}-achieves-${goalId}`, 'achieves', executionId, goalId);
    this.ensureEdge(`edge-${planId}-contains-${executionId}`, 'contains', planId, executionId);
  }

  private handleExecutionCompleted(event: ExecutionEvent & { type: 'ExecutionCompleted' }): void {
    const executionId = `exec-${event.executionId}`;
    this.graph.updateNode(executionId, {
      status: 'completed',
      durationMs: event.durationMs,
      stepsCompleted: event.stepsCompleted,
      totalSteps: event.totalSteps,
      totalRetries: event.totalRetries,
    });
  }

  private handleExecutionFailed(event: ExecutionEvent & { type: 'ExecutionFailed' }): void {
    const executionId = `exec-${event.executionId}`;
    this.graph.updateNode(executionId, {
      status: 'failed',
      error: event.error,
      errorCode: event.errorCode,
      durationMs: event.durationMs,
      failedStep: event.failedStep,
    });
  }

  private handleStepStarted(event: ExecutionEvent & { type: 'StepStarted' }): void {
    const stepId = `step-${event.stepId}`;
    const executionId = `exec-${event.executionId}`;

    this.graph.addNode({
      id: stepId,
      type: 'step',
      label: event.stepTitle,
      properties: {
        stepId: event.stepId,
        stepIndex: event.stepIndex,
        status: 'running',
      },
    });

    this.ensureEdge(`edge-${executionId}-contains-${stepId}`, 'contains', executionId, stepId);
  }

  private handleStepCompleted(event: ExecutionEvent & { type: 'StepCompleted' }): void {
    const stepId = `step-${event.stepId}`;
    this.graph.updateNode(stepId, {
      status: event.success ? 'completed' : 'failed',
      durationMs: event.durationMs,
    });
  }

  private handleStepFailed(event: ExecutionEvent & { type: 'StepFailed' }): void {
    const stepId = `step-${event.stepId}`;
    this.graph.updateNode(stepId, {
      status: 'failed',
      error: event.error,
      errorCode: event.errorCode,
      durationMs: event.durationMs,
    });
  }

  private handleRetryStarted(event: ExecutionEvent & { type: 'RetryStarted' }): void {
    const stepId = `step-${event.stepId}`;
    this.graph.updateNode(stepId, {
      status: 'retrying',
      retryAttempt: event.attempt,
      maxRetryAttempts: event.maxAttempts,
      retryDelayMs: event.delayMs,
    });
  }

  private handleRetryCompleted(event: ExecutionEvent & { type: 'RetryCompleted' }): void {
    const stepId = `step-${event.stepId}`;
    this.graph.updateNode(stepId, {
      retryAttempt: event.attempt,
      retrySuccess: event.success,
    });
  }

  private handleCheckpointCreated(event: ExecutionEvent & { type: 'CheckpointCreated' }): void {
    const checkpointId = `checkpoint-${event.checkpointId}`;
    this.graph.addNode({
      id: checkpointId,
      type: 'entity',
      label: `Checkpoint ${event.checkpointId.slice(0, 8)}`,
      properties: {
        checkpointId: event.checkpointId,
        completedSteps: event.completedSteps,
      },
    });

    const executionId = `exec-${event.executionId}`;
    this.ensureEdge(
      `edge-${executionId}-produces-${checkpointId}`,
      'produces',
      executionId,
      checkpointId,
    );
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private ensureEdge(
    id: string,
    type:
      | 'executes'
      | 'uses'
      | 'achieves'
      | 'depends_on'
      | 'contains'
      | 'produces'
      | 'consumes'
      | 'triggers'
      | 'references'
      | 'extends'
      | 'related_to',
    sourceId: GraphNodeId,
    targetId: GraphNodeId,
  ): void {
    if (!this.graph.getEdge(id)) {
      this.graph.addEdge({ id, type, sourceId, targetId, weight: 1, properties: {} });
    }
  }
}
