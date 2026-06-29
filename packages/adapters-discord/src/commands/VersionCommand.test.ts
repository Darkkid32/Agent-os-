import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME, PACKAGE_VERSION } from '@agent-os/hermes';
import { versionCommand } from './VersionCommand.js';

describe('Discord VersionCommand', () => {
  it('declares name, description, and viewer-class permission requirement', () => {
    expect(versionCommand.name).toBe('version');
    expect(versionCommand.description.length).toBeGreaterThan(0);
    expect(versionCommand.requires).toBe('version');
  });

  it('handler returns a DiscordMessage embedding Hermes package identity', async () => {
    const msg = await versionCommand.handler({} as never, {} as never);
    expect(typeof msg).toBe('object');
    // formatVersionMessage returns a DiscordEmbed-shaped object
    const text = JSON.stringify(msg);
    expect(text).toContain(PACKAGE_NAME);
    expect(text).toContain(PACKAGE_VERSION);
  });
});
