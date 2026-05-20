# CLAUDE.md — Blackmagic ATEM Video Mixer Adapter

> **Maintenance:** Update this file as changes are made during each session. Do not wait until end of session.

## Overview

ioBroker adapter for controlling Blackmagic ATEM video mixers. Supports 21+ model variants from Mini to Constellation 4K+ via capability-based state creation.

**Base path:** `atemmini.0`
**Protocol:** UDP via `atem-connection` library
**Source:** `src/main.ts` (TypeScript, ~1,870 lines) → compiled to `build/main.js`
**Build:** `npm run build` (TypeScript compilation)

## Build & Test

```bash
npm run build          # Compile TypeScript
npm run test           # Run mocha tests
npm run lint           # ESLint
```

## Architecture

- Single class `AtemAdapter extends utils.Adapter`
- `atem-connection` v3.8.0 handles UDP protocol, state synchronization, and event-driven updates
- Push-based: ATEM library fires `stateChanged` events → adapter updates specific ioBroker states
- Auto-detect model on first connection, rebuilds state tree to match actual device capabilities

## State Tree (abbreviated)

```
info.connection
device.{modelName, productId, videoMode, capabilities}
me[0-3].{programInput, previewInput, inTransition, transitionPosition}
me[0-3].transition.{style, mixRate, dipRate, wipeRate, dveRate, wipePattern}
me[0-3].fadeToBlack.{isFullyBlack, inTransition, rate}
me[0-3].usk[0-3].{onAir, type, fillSource, keySource, maskEnabled, flyEnabled}
commands.{cut, auto, ftb}
dsk[0-3].{onAir, tie, inTransition, rate, fillSource, keySource, auto}
aux[0-47].source
audio.master.{gain, balance, afv}
audio.monitor.{enabled, gain, mute, solo, dim}
audio.inputs.input[N].{gain, balance, mixOption}
audio.commands.resetPeaks
colorGenerator[0-1].{hue, saturation, luminance}
streaming.{status, start, stop, duration, cacheUsed}
recording.{status, start, stop, switchDisk, duration, remainingDiskSpace}
mediaPlayer[0-3].{sourceType, stillIndex, clipIndex, playing, loop, atBeginning}
tally.{programInputs, previewInputs}
macros.{run, stop, continue, isRunning, isWaiting, loop, runningIndex, recordedCount}
macros.slots[0-99].{name, isUsed, trigger}
inputs.input[N].{shortName, longName, inputId, portType}
```

## Model Capabilities

States are created conditionally based on model. Key capability flags:
- `mixEffectBlocks` (1-4), `upstreamKeyers` (1-4), `downstreamKeyers` (1-4)
- `auxOutputs` (1-48), `mediaPlayers` (1-4), `mediaStills` (20-32), `mediaClips` (0-2)
- `hasStreaming`, `hasRecording`, `hasMultiview`, `hasFairlightAudio`

Orphaned states are cleaned up when model changes. Max values: 4 ME blocks, 4 USKs, 4 DSKs, 48 aux outputs, 4 media players.

## Audio Mixer Duality

Supports both Classic Audio (older models) and Fairlight Audio (Pro models). Unified state interface (`audio.master`, `audio.monitor`, `audio.inputs`), separate command paths based on `hasFairlightAudio`.

## Configuration

| Option | Default | Description |
|---|---|---|
| `host` | `192.168.1.100` | ATEM IP address |
| `model` | `auto` | Model for capability detection (or auto-detect) |
| `reconnectInterval` | `5000` | Reconnect timeout (ms) |
| `pollInterval` | `1000` | Polling interval (ms) |

## Key Methods

- `connectAtem()` — Create Atem instance, register events, connect
- `createStateStructure()` — Build full state tree based on capabilities
- `cleanupOrphanedStates()` — Remove states not supported by current model
- `updateAllStates()` — Sync all ioBroker states from atem.state
- `processCommand(stateId, value)` — Route state writes to ATEM commands
- `handleStateChanged(path)` — Route ATEM events to state updates
- `updateCapabilitiesFromDevice()` — Auto-detect model capabilities

## Dependencies

- `@iobroker/adapter-core ^3.2.3`
- `atem-connection ^3.8.0` — Blackmagic ATEM UDP protocol library

## Files

```
src/main.ts           Core adapter (TypeScript)
build/main.js         Compiled output
admin/jsonConfig.json Admin UI (JSON config schema)
admin/i18n/           Translations (en, de)
test/                 Mocha tests
```
