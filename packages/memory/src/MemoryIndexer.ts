/**
 * Memory indexing service.
 *
 * Manages chunking and indexing of memory records.
 *
 * Layer: 2 (Platform)
 */

import type { MemoryRecord, MemoryChunk } from './MemoryTypes.js';
import { MemoryIndexFailedError } from './MemoryErrors.js';

// ---------------------------------------------------------------------------
// Indexer options
// ---------------------------------------------------------------------------

export interface MemoryIndexerOptions {
  /** Maximum chunk size in characters — default 1000 */
  readonly chunkSize?: number;

  /** Overlap between chunks in characters — default 100 */
  readonly chunkOverlap?: number;
}

const DEFAULT_INDEXER_OPTIONS: Required<MemoryIndexerOptions> = {
  chunkSize: 1000,
  chunkOverlap: 100,
};

// ---------------------------------------------------------------------------
// MemoryIndexer
// ---------------------------------------------------------------------------

/**
 * Indexing service that chunks and indexes memory records.
 */
export class MemoryIndexer {
  private readonly options: Required<MemoryIndexerOptions>;
  private readonly chunks = new Map<string, MemoryChunk[]>();

  constructor(options?: MemoryIndexerOptions) {
    this.options = { ...DEFAULT_INDEXER_OPTIONS, ...options };
  }

  /**
   * Index a memory record by chunking its content.
   */
  public index(record: MemoryRecord): readonly MemoryChunk[] {
    try {
      const chunks = this.chunkContent(record);
      this.chunks.set(record.id, chunks);
      return chunks;
    } catch (error) {
      throw new MemoryIndexFailedError(
        `Failed to index memory "${record.id}": ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  /**
   * Get chunks for a memory record.
   */
  public getChunks(memoryId: string): readonly MemoryChunk[] {
    return this.chunks.get(memoryId) ?? [];
  }

  /**
   * Remove a memory from the index.
   */
  public remove(memoryId: string): boolean {
    return this.chunks.delete(memoryId);
  }

  /**
   * Get all indexed memory IDs.
   */
  public getIndexedIds(): readonly string[] {
    return Array.from(this.chunks.keys());
  }

  /**
   * Get total chunk count.
   */
  public getChunkCount(): number {
    let total = 0;
    for (const chunks of this.chunks.values()) {
      total += chunks.length;
    }
    return total;
  }

  /**
   * Clear the index.
   */
  public clear(): void {
    this.chunks.clear();
  }

  /**
   * Search chunks by text content (simple substring match).
   */
  public searchChunks(text: string): readonly MemoryChunk[] {
    const lower = text.toLowerCase();
    const results: MemoryChunk[] = [];
    for (const chunks of this.chunks.values()) {
      for (const chunk of chunks) {
        if (chunk.content.toLowerCase().includes(lower)) {
          results.push(chunk);
        }
      }
    }
    return results;
  }

  private chunkContent(record: MemoryRecord): MemoryChunk[] {
    const content = record.content;
    if (content.length <= this.options.chunkSize) {
      const chunk: MemoryChunk = {
        id: `${record.id}:0`,
        parentId: record.id,
        content,
        index: 0,
        metadata: record.metadata,
      };
      if (record.embedding !== undefined) {
        return [{ ...chunk, embedding: record.embedding }];
      }
      return [chunk];
    }

    const chunks: MemoryChunk[] = [];
    let start = 0;
    let index = 0;

    while (start < content.length) {
      const end = Math.min(start + this.options.chunkSize, content.length);
      const chunkContent = content.slice(start, end);
      chunks.push({
        id: `${record.id}:${index}`,
        parentId: record.id,
        content: chunkContent,
        index,
        metadata: record.metadata,
      });
      start += this.options.chunkSize - this.options.chunkOverlap;
      index++;
    }

    return chunks;
  }
}
