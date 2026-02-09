# ioBroker.atemmini

[![NPM version](https://img.shields.io/npm/v/iobroker.atemmini.svg)](https://www.npmjs.com/package/iobroker.atemmini)
[![License](https://img.shields.io/npm/l/iobroker.atemmini.svg)](LICENSE)

Control Blackmagic ATEM Mini Pro video mixers from ioBroker.

## Description

This adapter allows you to control Blackmagic Design ATEM Mini Pro (and compatible) video mixers over the network. It uses the reverse-engineered ATEM UDP protocol via the [atem-connection](https://github.com/Sofie-Automation/sofie-atem-connection) library.

## Features

- **Program/Preview switching** - Change program and preview inputs
- **Transitions** - Cut, Auto, and manual T-bar control
- **Transition styles** - Mix, Dip, Wipe, DVE, Sting
- **Fade to Black** - Toggle and configure FTB rate
- **Downstream Keyers** - On air, tie, auto, and rate control
- **Upstream Keyers** - On air, type, fill/key source selection
- **Audio Mixer** - Master gain control
- **Streaming** - Start/stop streaming (ATEM Mini Pro)
- **Recording** - Start/stop recording (ATEM Mini Pro)
- **Media Players** - Source type and index selection
- **Macros** - Run, stop, and loop control

## Requirements

- ioBroker >= 5.0.19
- Node.js >= 18.0.0
- Blackmagic ATEM Mini Pro (or compatible ATEM switcher)
- Network connectivity to the ATEM device

## Installation

Install the adapter through the ioBroker admin interface or via npm:

```bash
cd /opt/iobroker
iobroker add atemmini
```

Or for development:

```bash
npm install iobroker.atemmini
```

## Configuration

1. Open the adapter configuration in ioBroker admin
2. Enter the IP address of your ATEM device
3. Optionally adjust the reconnect interval
4. Save and start the adapter

## States

### Device Information
| State | Description |
|-------|-------------|
| `device.modelName` | Model name of the connected ATEM |
| `device.productId` | Product identifier |
| `info.connection` | Connection status |

### Mix Effect (me0)
| State | R/W | Description |
|-------|-----|-------------|
| `me0.programInput` | R/W | Current program input (1-8, etc.) |
| `me0.previewInput` | R/W | Current preview input |
| `me0.inTransition` | R | Transition in progress |
| `me0.transitionPosition` | R/W | T-bar position (0-10000) |
| `me0.transitionStyle` | R/W | Transition style (0=Mix, 1=Dip, 2=Wipe, 3=DVE, 4=Sting) |

### Commands
| State | Description |
|-------|-------------|
| `commands.cut` | Perform cut transition |
| `commands.auto` | Perform auto transition |
| `commands.ftb` | Toggle fade to black |

### Downstream Keyers (dsk0, dsk1)
| State | R/W | Description |
|-------|-----|-------------|
| `dsk0.onAir` | R/W | DSK on air status |
| `dsk0.tie` | R/W | Tie to next transition |
| `dsk0.rate` | R/W | Transition rate (frames) |
| `dsk0.auto` | W | Perform auto DSK transition |

### Upstream Keyers (me0.usk0-3)
| State | R/W | Description |
|-------|-----|-------------|
| `me0.usk0.onAir` | R/W | USK on air status |
| `me0.usk0.type` | R/W | Key type (0=Luma, 1=Chroma, 2=Pattern, 3=DVE) |
| `me0.usk0.fillSource` | R/W | Fill source input |
| `me0.usk0.keySource` | R/W | Key source input |

### Streaming (ATEM Mini Pro)
| State | R/W | Description |
|-------|-----|-------------|
| `streaming.status` | R | Current streaming status |
| `streaming.start` | W | Start streaming |
| `streaming.stop` | W | Stop streaming |
| `streaming.duration` | R | Streaming duration (seconds) |

### Recording (ATEM Mini Pro)
| State | R/W | Description |
|-------|-----|-------------|
| `recording.status` | R | Current recording status |
| `recording.start` | W | Start recording |
| `recording.stop` | W | Stop recording |
| `recording.duration` | R | Recording duration (seconds) |

### Media Players (mediaPlayer0-1)
| State | R/W | Description |
|-------|-----|-------------|
| `mediaPlayer0.sourceType` | R/W | Source type (1=Still, 2=Clip) |
| `mediaPlayer0.stillIndex` | R/W | Still image index |
| `mediaPlayer0.clipIndex` | R/W | Clip index |

### Macros
| State | R/W | Description |
|-------|-----|-------------|
| `macros.run` | W | Run macro by index (0-99) |
| `macros.stop` | W | Stop running macro |
| `macros.isRunning` | R | Macro currently running |
| `macros.loop` | R/W | Loop macro playback |

### Input Sources (inputs.input*)
Dynamically created for each available input:
| State | Description |
|-------|-------------|
| `inputs.input1.shortName` | Short name (4 chars) |
| `inputs.input1.longName` | Long name (20 chars) |
| `inputs.input1.inputId` | Numeric input ID |

## Input IDs

Standard ATEM input mappings:
| ID | Source |
|----|--------|
| 1-8 | Camera inputs |
| 1000 | Color Bars |
| 2001-2002 | Color Generators |
| 3010, 3011 | Media Player 1, 2 |
| 3020, 3021 | Media Player 1 Key, 2 Key |
| 7001-7002 | Clean Feed 1, 2 |
| 10010, 10011 | Program, Preview |
| 0 | Black |

## Example Usage

### Switch to Camera 1
```javascript
setState('atemmini.0.me0.programInput', 1);
```

### Perform Cut
```javascript
setState('atemmini.0.commands.cut', true);
```

### Start Streaming
```javascript
setState('atemmini.0.streaming.start', true);
```

### Run Macro 5
```javascript
setState('atemmini.0.macros.run', 5);
```

## Protocol Information

This adapter uses the reverse-engineered ATEM UDP protocol (port 9910). The protocol has been documented by the open-source community:

- [OpenSwitcher Documentation](https://docs.openswitcher.org/)
- [atem-connection Library](https://github.com/Sofie-Automation/sofie-atem-connection)

## Security Note

The ATEM protocol has no authentication. Ensure your ATEM device is on a trusted, private network.

## Changelog

### 0.1.0
- Initial release
- Basic switching functionality
- DSK and USK control
- Streaming and recording control (ATEM Mini Pro)
- Media player control
- Macro support

## License

MIT License - see [LICENSE](LICENSE) for details.
