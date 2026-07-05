/**
 * ioBroker Blackmagic ATEM Adapter
 * Controls Blackmagic ATEM video mixers via UDP protocol
 * Supports all ATEM models including Mini, Mini Pro, Television Studio, Constellation, and more
 */

import * as utils from '@iobroker/adapter-core';
import { Atem, AtemConnectionStatus } from 'atem-connection';

// Adapter configuration interface
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace ioBroker {
        interface AdapterConfig {
            host: string;
            model: string;
            reconnectInterval: number;
        }
    }
}

// Model capabilities definition
interface ModelCapabilities {
    mixEffectBlocks: number;
    upstreamKeyers: number;
    downstreamKeyers: number;
    auxOutputs: number;
    mediaPlayers: number;
    mediaStills: number;
    mediaClips: number;
    colorGenerators: number;
    superSources: number;
    hasStreaming: boolean;
    hasRecording: boolean;
    hasMultiview: boolean;
    hasFairlightAudio: boolean;
}

// Model capabilities lookup
// Model capabilities based on official Blackmagic Design specifications
// Sources: https://www.blackmagicdesign.com/products/atemmini/techspecs
//          https://www.blackmagicdesign.com/products/atemconstellation/techspecs
//          https://www.blackmagicdesign.com/products/atemtelevisionstudio/techspecs
//          https://www.blackmagicdesign.com/products/atemsdi/techspecs
const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
    // ATEM Mini Series (20 stills, 0 clips)
    mini: {
        mixEffectBlocks: 1,
        upstreamKeyers: 1,
        downstreamKeyers: 1,
        auxOutputs: 1,
        mediaPlayers: 1,
        mediaStills: 20,
        mediaClips: 0,
        colorGenerators: 2,
        superSources: 0,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: false,
        hasFairlightAudio: false,
    },
    miniPro: {
        mixEffectBlocks: 1,
        upstreamKeyers: 1,
        downstreamKeyers: 1,
        auxOutputs: 1,
        mediaPlayers: 1,
        mediaStills: 20,
        mediaClips: 0,
        colorGenerators: 2,
        superSources: 0,
        hasStreaming: true,
        hasRecording: true,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    miniProISO: {
        mixEffectBlocks: 1,
        upstreamKeyers: 1,
        downstreamKeyers: 1,
        auxOutputs: 1,
        mediaPlayers: 1,
        mediaStills: 20,
        mediaClips: 0,
        colorGenerators: 2,
        superSources: 0,
        hasStreaming: true,
        hasRecording: true,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    miniExtreme: {
        mixEffectBlocks: 1,
        upstreamKeyers: 4,
        downstreamKeyers: 2,
        auxOutputs: 2,
        mediaPlayers: 2,
        mediaStills: 20,
        mediaClips: 0,
        colorGenerators: 2,
        superSources: 1,
        hasStreaming: true,
        hasRecording: true,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    miniExtremeISO: {
        mixEffectBlocks: 1,
        upstreamKeyers: 4,
        downstreamKeyers: 2,
        auxOutputs: 2,
        mediaPlayers: 2,
        mediaStills: 20,
        mediaClips: 0,
        colorGenerators: 2,
        superSources: 1,
        hasStreaming: true,
        hasRecording: true,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    miniExtremeISOG2: {
        mixEffectBlocks: 1,
        upstreamKeyers: 4,
        downstreamKeyers: 2,
        auxOutputs: 4,
        mediaPlayers: 2,
        mediaStills: 20,
        mediaClips: 0,
        colorGenerators: 2,
        superSources: 1,
        hasStreaming: true,
        hasRecording: true,
        hasMultiview: true,
        hasFairlightAudio: true,
    },

    // ATEM SDI Series (20 stills, 0 clips)
    sdi: {
        mixEffectBlocks: 1,
        upstreamKeyers: 1,
        downstreamKeyers: 1,
        auxOutputs: 1,
        mediaPlayers: 1,
        mediaStills: 20,
        mediaClips: 0,
        colorGenerators: 2,
        superSources: 0,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: false,
        hasFairlightAudio: false,
    },
    sdiProISO: {
        mixEffectBlocks: 1,
        upstreamKeyers: 1,
        downstreamKeyers: 1,
        auxOutputs: 1,
        mediaPlayers: 1,
        mediaStills: 20,
        mediaClips: 0,
        colorGenerators: 2,
        superSources: 0,
        hasStreaming: true,
        hasRecording: true,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    sdiExtremeISO: {
        mixEffectBlocks: 1,
        upstreamKeyers: 4,
        downstreamKeyers: 2,
        auxOutputs: 2,
        mediaPlayers: 2,
        mediaStills: 20,
        mediaClips: 0,
        colorGenerators: 2,
        superSources: 1,
        hasStreaming: true,
        hasRecording: true,
        hasMultiview: true,
        hasFairlightAudio: true,
    },

    // ATEM Television Studio Series (32 stills, 2 clips)
    tvStudioHD: {
        mixEffectBlocks: 1,
        upstreamKeyers: 1,
        downstreamKeyers: 2,
        auxOutputs: 1,
        mediaPlayers: 2,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 0,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: false,
    },
    tvStudioHD8: {
        mixEffectBlocks: 1,
        upstreamKeyers: 4,
        downstreamKeyers: 2,
        auxOutputs: 2,
        mediaPlayers: 2,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 1,
        hasStreaming: true,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    tvStudioHD8ISO: {
        mixEffectBlocks: 1,
        upstreamKeyers: 4,
        downstreamKeyers: 2,
        auxOutputs: 2,
        mediaPlayers: 2,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 1,
        hasStreaming: true,
        hasRecording: true,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    tvStudio4K8: {
        mixEffectBlocks: 1,
        upstreamKeyers: 4,
        downstreamKeyers: 2,
        auxOutputs: 10,
        mediaPlayers: 2,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 1,
        hasStreaming: true,
        hasRecording: true,
        hasMultiview: true,
        hasFairlightAudio: true,
    },

    // ATEM Constellation HD Series (32 stills, 2 clips)
    '1meConstellationHD': {
        mixEffectBlocks: 1,
        upstreamKeyers: 4,
        downstreamKeyers: 1,
        auxOutputs: 6,
        mediaPlayers: 2,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 0,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    '2meConstellationHD': {
        mixEffectBlocks: 2,
        upstreamKeyers: 4,
        downstreamKeyers: 2,
        auxOutputs: 12,
        mediaPlayers: 2,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 1,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    '4meConstellationHD': {
        mixEffectBlocks: 4,
        upstreamKeyers: 4,
        downstreamKeyers: 4,
        auxOutputs: 24,
        mediaPlayers: 4,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 2,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },

    // ATEM Constellation 4K Series (32 stills, 2 clips)
    '1meConstellation4K': {
        mixEffectBlocks: 1,
        upstreamKeyers: 4,
        downstreamKeyers: 1,
        auxOutputs: 6,
        mediaPlayers: 2,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 0,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    '2meConstellation4K': {
        mixEffectBlocks: 2,
        upstreamKeyers: 4,
        downstreamKeyers: 2,
        auxOutputs: 12,
        mediaPlayers: 2,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 1,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    '4meConstellation4K': {
        mixEffectBlocks: 4,
        upstreamKeyers: 4,
        downstreamKeyers: 4,
        auxOutputs: 24,
        mediaPlayers: 4,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 2,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    '4meConstellation4KPlus': {
        mixEffectBlocks: 4,
        upstreamKeyers: 4,
        downstreamKeyers: 4,
        auxOutputs: 48,
        mediaPlayers: 4,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 2,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },

    // Legacy aliases for backwards compatibility (32 stills, 2 clips)
    '1me4k': {
        mixEffectBlocks: 1,
        upstreamKeyers: 4,
        downstreamKeyers: 1,
        auxOutputs: 6,
        mediaPlayers: 2,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 0,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    '2me4k': {
        mixEffectBlocks: 2,
        upstreamKeyers: 4,
        downstreamKeyers: 2,
        auxOutputs: 12,
        mediaPlayers: 2,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 1,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    '4me4k': {
        mixEffectBlocks: 4,
        upstreamKeyers: 4,
        downstreamKeyers: 4,
        auxOutputs: 24,
        mediaPlayers: 4,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 2,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    constellationHD: {
        mixEffectBlocks: 4,
        upstreamKeyers: 4,
        downstreamKeyers: 4,
        auxOutputs: 24,
        mediaPlayers: 4,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 2,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
    constellation4K: {
        mixEffectBlocks: 4,
        upstreamKeyers: 4,
        downstreamKeyers: 4,
        auxOutputs: 24,
        mediaPlayers: 4,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 2,
        hasStreaming: false,
        hasRecording: false,
        hasMultiview: true,
        hasFairlightAudio: true,
    },

    // Auto/default - will be updated from actual device state
    auto: {
        mixEffectBlocks: 1,
        upstreamKeyers: 4,
        downstreamKeyers: 2,
        auxOutputs: 6,
        mediaPlayers: 2,
        mediaStills: 32,
        mediaClips: 2,
        colorGenerators: 2,
        superSources: 1,
        hasStreaming: true,
        hasRecording: true,
        hasMultiview: true,
        hasFairlightAudio: true,
    },
};

class AtemAdapter extends utils.Adapter {
    private atem: Atem | null = null;
    private reconnectTimeout: ioBroker.Timeout | undefined = undefined;
    private isConnecting = false;
    private capabilities: ModelCapabilities = MODEL_CAPABILITIES.auto;

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'blackmagic-atem',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Called when adapter is ready to start
     */
    private async onReady(): Promise<void> {
        this.log.info('Blackmagic ATEM adapter starting...');

        // Validate configuration
        if (!this.config.host) {
            this.log.error('No ATEM host configured. Please configure the adapter.');
            return;
        }

        // Set capabilities based on model selection
        if (this.config.model && this.config.model !== 'auto') {
            this.capabilities = MODEL_CAPABILITIES[this.config.model] || MODEL_CAPABILITIES.auto;
            this.log.info(`Using configured model: ${this.config.model}`);
        } else {
            this.log.info(`Model set to auto-detect, using default capabilities until device connects`);
        }
        this.log.info(
            `Active capabilities: mediaClips=${this.capabilities.mediaClips}, mediaStills=${this.capabilities.mediaStills}, mediaPlayers=${this.capabilities.mediaPlayers}`,
        );

        this.log.info(`ATEM host configured: ${this.config.host}`);

        // Create base state structure
        try {
            this.log.info('Creating state structure...');
            await this.createStateStructure();
            this.log.info('State structure created successfully');
        } catch (error) {
            this.log.error(`Failed to create state structure: ${(error as Error).message}`);
            return;
        }

        // Initialize ATEM connection
        await this.connectAtem();
    }

    /**
     * Create the state structure for all ATEM features
     */
    private async createStateStructure(): Promise<void> {
        // Clean up states that don't match current model capabilities
        await this.cleanupOrphanedStates();

        // Device info channel
        await this.createDeviceInfoStates();

        // Mix Effects Blocks
        for (let me = 0; me < this.capabilities.mixEffectBlocks; me++) {
            await this.createMixEffectStates(me);
        }

        // Commands channel
        await this.createCommandStates();

        // Downstream Keyers
        for (let dsk = 0; dsk < this.capabilities.downstreamKeyers; dsk++) {
            await this.createDSKStates(dsk);
        }

        // Auxiliary Outputs
        for (let aux = 0; aux < this.capabilities.auxOutputs; aux++) {
            await this.createAuxStates(aux);
        }

        // Audio Mixer
        await this.createAudioStates();

        // Color Generators
        for (let cg = 0; cg < this.capabilities.colorGenerators; cg++) {
            await this.createColorGeneratorStates(cg);
        }

        // Streaming (if supported)
        if (this.capabilities.hasStreaming) {
            await this.createStreamingStates();
        }

        // Recording (if supported)
        if (this.capabilities.hasRecording) {
            await this.createRecordingStates();
        }

        // Media Players
        for (let mp = 0; mp < this.capabilities.mediaPlayers; mp++) {
            await this.createMediaPlayerStates(mp);
        }

        // Tally
        await this.createTallyStates();

        // Inputs channel - will be populated dynamically
        await this.ensureObject('inputs', {
            type: 'channel',
            common: { name: 'Input Sources' },
            native: {},
        });

        // Macros
        await this.createMacroStates();

        // Subscribe to all writable states
        await this.subscribeStatesAsync('*');
    }

    /**
     * Clean up states that don't match current model capabilities
     * This handles the case where user changes model configuration
     */
    private async cleanupOrphanedStates(): Promise<void> {
        this.log.info('Checking for orphaned states from previous model configuration...');

        // Define maximum possible values (based on largest ATEM model - Constellation 4K Plus)
        const MAX_ME_BLOCKS = 4;
        const MAX_USKS = 4;
        const MAX_DSKS = 4;
        const MAX_AUX_OUTPUTS = 48; // Constellation 4K Plus has 48
        const MAX_MEDIA_PLAYERS = 4;
        const MAX_COLOR_GENERATORS = 2;
        // Note: SuperSource states not yet implemented, so no cleanup needed

        // Clean up extra Mix Effect blocks and their USKs
        for (let me = this.capabilities.mixEffectBlocks; me < MAX_ME_BLOCKS; me++) {
            await this.deleteObjectWithChildren(`me${me}`);
        }

        // Clean up extra USKs within valid MEs, plus legacy flat states
        for (let me = 0; me < this.capabilities.mixEffectBlocks; me++) {
            for (let usk = this.capabilities.upstreamKeyers; usk < MAX_USKS; usk++) {
                await this.deleteObjectWithChildren(`me${me}.usk${usk}`);
            }
            // Legacy: older versions created a flat me{n}.transitionStyle;
            // the current tree uses the nested me{n}.transition.style instead
            await this.deleteObjectWithChildren(`me${me}.transitionStyle`);
        }

        // Clean up extra DSKs
        for (let dsk = this.capabilities.downstreamKeyers; dsk < MAX_DSKS; dsk++) {
            await this.deleteObjectWithChildren(`dsk${dsk}`);
        }

        // Clean up extra auxiliary outputs
        for (let aux = this.capabilities.auxOutputs; aux < MAX_AUX_OUTPUTS; aux++) {
            await this.deleteObjectWithChildren(`aux${aux}`);
        }

        // Clean up extra media players
        for (let mp = this.capabilities.mediaPlayers; mp < MAX_MEDIA_PLAYERS; mp++) {
            await this.deleteObjectWithChildren(`mediaPlayer${mp}`);
        }

        // Clean up clip-related states on models that don't support clips
        if (this.capabilities.mediaClips === 0) {
            for (let mp = 0; mp < this.capabilities.mediaPlayers; mp++) {
                await this.deleteObjectWithChildren(`mediaPlayer${mp}.clipIndex`);
            }
        }

        // Clean up extra color generators
        for (let cg = this.capabilities.colorGenerators; cg < MAX_COLOR_GENERATORS; cg++) {
            await this.deleteObjectWithChildren(`colorGenerator${cg}`);
        }

        // Clean up streaming if not supported
        if (!this.capabilities.hasStreaming) {
            await this.deleteObjectWithChildren('streaming');
        }

        // Clean up recording if not supported
        if (!this.capabilities.hasRecording) {
            await this.deleteObjectWithChildren('recording');
        }

        // Legacy: older versions created audio.master.programOutGain, which was
        // never wired to a command or device update; the master gain state covers it
        await this.deleteObjectWithChildren('audio.master.programOutGain');

        this.log.info('Orphaned state cleanup complete');
    }

    /**
     * Delete an object and all its children recursively
     *
     * @param objectId Relative object id (without namespace) whose subtree should be removed
     */
    private async deleteObjectWithChildren(objectId: string): Promise<void> {
        try {
            // Get all objects under this ID
            const objects = await this.getObjectListAsync({
                startkey: `${this.namespace}.${objectId}`,
                endkey: `${this.namespace}.${objectId}\u9999`,
            });

            if (objects?.rows?.length) {
                this.log.debug(`Deleting orphaned object tree: ${objectId} (${objects.rows.length} objects)`);

                // Delete all child objects
                for (const row of objects.rows) {
                    const id = row.id.substring(this.namespace.length + 1); // Remove namespace prefix
                    try {
                        await this.delObjectAsync(id);
                        // Also delete state if it exists
                        await this.delStateAsync(id);
                    } catch {
                        // Ignore errors for non-existent objects
                    }
                }
            }
        } catch {
            // Object doesn't exist, nothing to clean up
        }
    }

    /**
     * Wrapper around setObjectNotExistsAsync that guarantees every created state
     * declares a type-appropriate `def` default (boolean→false, number→0, else '')
     * when the caller does not supply one. Non-state objects pass through unchanged.
     *
     * @param id  Object ID (relative to the adapter namespace).
     * @param obj Settable object definition to create if it does not yet exist.
     */
    private async ensureObject(id: string, obj: ioBroker.SettableObject): Promise<void> {
        if (obj.type === 'state' && obj.common.def === undefined) {
            obj.common.def = obj.common.type === 'boolean' ? false : obj.common.type === 'number' ? 0 : '';
        }
        await this.setObjectNotExistsAsync(id, obj);
    }

    private async createDeviceInfoStates(): Promise<void> {
        await this.ensureObject('device', {
            type: 'channel',
            common: { name: 'Device Information' },
            native: {},
        });

        const deviceStates = [
            { id: 'modelName', name: 'Model Name', type: 'string' as const, role: 'info.name' },
            { id: 'productId', name: 'Product ID', type: 'string' as const, role: 'info.serial' },
            { id: 'videoMode', name: 'Video Mode', type: 'string' as const, role: 'text' },
            { id: 'configuredModel', name: 'Configured Model', type: 'string' as const, role: 'text' },
            { id: 'capabilities', name: 'Active Capabilities', type: 'string' as const, role: 'json' },
        ];

        for (const state of deviceStates) {
            await this.ensureObject(`device.${state.id}`, {
                type: 'state',
                common: { name: state.name, type: state.type, role: state.role, read: true, write: false },
                native: {},
            });
        }

        // Set the configured model immediately (doesn't require connection)
        await this.setStateAsync('device.configuredModel', this.config.model || 'auto', true);
        await this.setStateAsync('device.capabilities', JSON.stringify(this.capabilities), true);
    }

    private async createMixEffectStates(meIndex: number): Promise<void> {
        const meId = `me${meIndex}`;

        await this.ensureObject(meId, {
            type: 'channel',
            common: { name: `Mix Effect ${meIndex + 1}` },
            native: {},
        });

        // Basic ME states
        const meStates = [
            { id: 'programInput', name: 'Program Input', type: 'number' as const, role: 'media.input', write: true },
            { id: 'previewInput', name: 'Preview Input', type: 'number' as const, role: 'media.input', write: true },
            { id: 'inTransition', name: 'In Transition', type: 'boolean' as const, role: 'indicator', write: false },
            {
                id: 'transitionPosition',
                name: 'Transition Position',
                type: 'number' as const,
                role: 'level',
                write: true,
                min: 0,
                max: 10000,
            },
            {
                id: 'transitionFramesRemaining',
                name: 'Transition Frames Remaining',
                type: 'number' as const,
                role: 'value',
                write: false,
            },
        ];

        for (const state of meStates) {
            await this.ensureObject(`${meId}.${state.id}`, {
                type: 'state',
                common: {
                    name: state.name,
                    type: state.type,
                    role: state.role,
                    read: true,
                    write: state.write,
                    min: state.min,
                    max: state.max,
                },
                native: {},
            });
        }

        // Transition settings
        await this.ensureObject(`${meId}.transition`, {
            type: 'channel',
            common: { name: 'Transition Settings' },
            native: {},
        });

        await this.ensureObject(`${meId}.transition.style`, {
            type: 'state',
            common: {
                name: 'Transition Style',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                states: { 0: 'Mix', 1: 'Dip', 2: 'Wipe', 3: 'DVE', 4: 'Sting' },
            },
            native: {},
        });

        await this.ensureObject(`${meId}.transition.mixRate`, {
            type: 'state',
            common: {
                name: 'Mix Rate',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                unit: 'frames',
                min: 1,
                max: 250,
            },
            native: {},
        });

        await this.ensureObject(`${meId}.transition.dipRate`, {
            type: 'state',
            common: {
                name: 'Dip Rate',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                unit: 'frames',
                min: 1,
                max: 250,
            },
            native: {},
        });

        await this.ensureObject(`${meId}.transition.dipSource`, {
            type: 'state',
            common: { name: 'Dip Source', type: 'number', role: 'media.input', read: true, write: true },
            native: {},
        });

        await this.ensureObject(`${meId}.transition.wipeRate`, {
            type: 'state',
            common: {
                name: 'Wipe Rate',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                unit: 'frames',
                min: 1,
                max: 250,
            },
            native: {},
        });

        await this.ensureObject(`${meId}.transition.wipePattern`, {
            type: 'state',
            common: {
                name: 'Wipe Pattern',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                states: {
                    0: 'Left to Right Bar',
                    1: 'Top to Bottom Bar',
                    2: 'Horizontal Barn Door',
                    3: 'Vertical Barn Door',
                    4: 'Corners In Four Box',
                    5: 'Rectangle Iris',
                    6: 'Diamond Iris',
                    7: 'Circle Iris',
                    8: 'Top Left Box',
                    9: 'Top Right Box',
                    10: 'Bottom Right Box',
                    11: 'Bottom Left Box',
                    12: 'Top Center Box',
                    13: 'Right Center Box',
                    14: 'Bottom Center Box',
                    15: 'Left Center Box',
                    16: 'Top Left Diagonal',
                    17: 'Top Right Diagonal',
                },
            },
            native: {},
        });

        await this.ensureObject(`${meId}.transition.dveRate`, {
            type: 'state',
            common: {
                name: 'DVE Rate',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                unit: 'frames',
                min: 1,
                max: 250,
            },
            native: {},
        });

        // Fade to Black
        await this.ensureObject(`${meId}.fadeToBlack`, {
            type: 'channel',
            common: { name: 'Fade to Black' },
            native: {},
        });

        await this.ensureObject(`${meId}.fadeToBlack.isFullyBlack`, {
            type: 'state',
            common: { name: 'Is Fully Black', type: 'boolean', role: 'indicator', read: true, write: false },
            native: {},
        });

        await this.ensureObject(`${meId}.fadeToBlack.inTransition`, {
            type: 'state',
            common: { name: 'FTB In Transition', type: 'boolean', role: 'indicator', read: true, write: false },
            native: {},
        });

        await this.ensureObject(`${meId}.fadeToBlack.rate`, {
            type: 'state',
            common: {
                name: 'FTB Rate',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                unit: 'frames',
                min: 1,
                max: 250,
            },
            native: {},
        });

        // Upstream Keyers for this ME
        for (let usk = 0; usk < this.capabilities.upstreamKeyers; usk++) {
            await this.createUSKStates(meIndex, usk);
        }
    }

    private async createUSKStates(meIndex: number, uskIndex: number): Promise<void> {
        const uskId = `me${meIndex}.usk${uskIndex}`;

        await this.ensureObject(uskId, {
            type: 'channel',
            common: { name: `Upstream Key ${uskIndex + 1}` },
            native: {},
        });

        const uskStates = [
            { id: 'onAir', name: 'On Air', type: 'boolean' as const, role: 'switch', write: true },
            {
                id: 'type',
                name: 'Key Type',
                type: 'number' as const,
                role: 'level',
                write: true,
                states: { 0: 'Luma', 1: 'Chroma', 2: 'Pattern', 3: 'DVE' },
            },
            { id: 'fillSource', name: 'Fill Source', type: 'number' as const, role: 'media.input', write: true },
            { id: 'keySource', name: 'Key Source', type: 'number' as const, role: 'media.input', write: true },
            { id: 'maskEnabled', name: 'Mask Enabled', type: 'boolean' as const, role: 'switch', write: true },
            { id: 'flyEnabled', name: 'Fly Enabled', type: 'boolean' as const, role: 'switch', write: true },
        ];

        for (const state of uskStates) {
            await this.ensureObject(`${uskId}.${state.id}`, {
                type: 'state',
                common: {
                    name: state.name,
                    type: state.type,
                    role: state.role,
                    read: true,
                    write: state.write,
                    states: state.states,
                },
                native: {},
            });
        }
    }

    private async createCommandStates(): Promise<void> {
        await this.ensureObject('commands', {
            type: 'channel',
            common: { name: 'Switcher Commands' },
            native: {},
        });

        const commands = [
            { id: 'cut', name: 'Cut', desc: 'Perform a cut transition' },
            { id: 'auto', name: 'Auto Transition', desc: 'Perform an auto transition' },
            { id: 'ftb', name: 'Fade to Black', desc: 'Toggle fade to black' },
        ];

        for (const cmd of commands) {
            await this.ensureObject(`commands.${cmd.id}`, {
                type: 'state',
                common: { name: cmd.name, type: 'boolean', role: 'button', read: false, write: true, desc: cmd.desc },
                native: {},
            });
        }
    }

    private async createDSKStates(dskIndex: number): Promise<void> {
        const dskId = `dsk${dskIndex}`;

        await this.ensureObject(dskId, {
            type: 'channel',
            common: { name: `Downstream Key ${dskIndex + 1}` },
            native: {},
        });

        const dskStates = [
            { id: 'onAir', name: 'On Air', type: 'boolean' as const, role: 'switch', write: true },
            { id: 'tie', name: 'Tie to Next Transition', type: 'boolean' as const, role: 'switch', write: true },
            { id: 'inTransition', name: 'In Transition', type: 'boolean' as const, role: 'indicator', write: false },
            { id: 'rate', name: 'Rate', type: 'number' as const, role: 'level', write: true, unit: 'frames' },
            { id: 'fillSource', name: 'Fill Source', type: 'number' as const, role: 'media.input', write: true },
            { id: 'keySource', name: 'Key Source', type: 'number' as const, role: 'media.input', write: true },
            { id: 'preMultiplied', name: 'Pre-Multiplied', type: 'boolean' as const, role: 'switch', write: true },
        ];

        for (const state of dskStates) {
            await this.ensureObject(`${dskId}.${state.id}`, {
                type: 'state',
                common: {
                    name: state.name,
                    type: state.type,
                    role: state.role,
                    read: true,
                    write: state.write,
                    unit: state.unit,
                },
                native: {},
            });
        }

        await this.ensureObject(`${dskId}.auto`, {
            type: 'state',
            common: {
                name: 'Auto DSK',
                type: 'boolean',
                role: 'button',
                read: false,
                write: true,
                desc: 'Perform auto DSK transition',
            },
            native: {},
        });
    }

    private async createAuxStates(auxIndex: number): Promise<void> {
        const auxId = `aux${auxIndex}`;

        await this.ensureObject(auxId, {
            type: 'channel',
            common: { name: `Auxiliary Output ${auxIndex + 1}` },
            native: {},
        });

        await this.ensureObject(`${auxId}.source`, {
            type: 'state',
            common: {
                name: 'Source',
                type: 'number',
                role: 'media.input',
                read: true,
                write: true,
                desc: 'Auxiliary output source input',
            },
            native: {},
        });
    }

    private async createAudioStates(): Promise<void> {
        await this.ensureObject('audio', {
            type: 'channel',
            common: { name: 'Audio Mixer' },
            native: {},
        });

        // Master output
        await this.ensureObject('audio.master', {
            type: 'channel',
            common: { name: 'Master Output' },
            native: {},
        });

        const masterStates = [
            {
                id: 'gain',
                name: 'Master Gain',
                type: 'number' as const,
                role: 'level.volume',
                write: true,
                min: -60,
                max: 6,
                unit: 'dB',
            },
            {
                id: 'balance',
                name: 'Master Balance',
                type: 'number' as const,
                role: 'level',
                write: true,
                min: -50,
                max: 50,
            },
            { id: 'afv', name: 'Audio Follow Video', type: 'boolean' as const, role: 'switch', write: true },
            {
                id: 'afvCrossfade',
                name: 'AFV Crossfade Transition',
                type: 'boolean' as const,
                role: 'switch',
                write: true,
            },
        ];

        // balance and afvCrossfade are Classic-audio-only: the Fairlight master has
        // no balance and no exposed AFV-crossfade setter, so on Fairlight models we
        // skip them (they would be writable but no-op) and remove any left over from
        // older adapter versions. Master gain/afv are supported on both mixer types.
        const classicOnlyMaster = ['balance', 'afvCrossfade'];
        for (const state of masterStates) {
            if (this.capabilities.hasFairlightAudio && classicOnlyMaster.includes(state.id)) {
                await this.deleteObjectWithChildren(`audio.master.${state.id}`);
                continue;
            }
            await this.ensureObject(`audio.master.${state.id}`, {
                type: 'state',
                common: {
                    name: state.name,
                    type: state.type,
                    role: state.role,
                    read: true,
                    write: state.write,
                    min: state.min,
                    max: state.max,
                    unit: state.unit,
                },
                native: {},
            });
        }

        // Monitor channel
        await this.ensureObject('audio.monitor', {
            type: 'channel',
            common: { name: 'Monitor Output' },
            native: {},
        });

        const monitorStates = [
            { id: 'enabled', name: 'Monitor Enabled', type: 'boolean' as const, role: 'switch', write: true },
            {
                id: 'gain',
                name: 'Monitor Gain',
                type: 'number' as const,
                role: 'level.volume',
                write: true,
                min: -60,
                max: 6,
                unit: 'dB',
            },
            { id: 'mute', name: 'Monitor Mute', type: 'boolean' as const, role: 'switch', write: true },
            { id: 'solo', name: 'Monitor Solo', type: 'boolean' as const, role: 'switch', write: true },
            { id: 'dim', name: 'Monitor Dim', type: 'boolean' as const, role: 'switch', write: true },
        ];

        // enabled/solo/dim are Classic-audio-only monitor controls; the Fairlight
        // mixer has no equivalent, so on Fairlight models we skip creating them
        // (they would be writable but no-op) and remove any left over from older
        // adapter versions.
        const classicOnlyMonitor = ['enabled', 'solo', 'dim'];
        for (const state of monitorStates) {
            if (this.capabilities.hasFairlightAudio && classicOnlyMonitor.includes(state.id)) {
                await this.deleteObjectWithChildren(`audio.monitor.${state.id}`);
                continue;
            }
            await this.ensureObject(`audio.monitor.${state.id}`, {
                type: 'state',
                common: {
                    name: state.name,
                    type: state.type,
                    role: state.role,
                    read: true,
                    write: state.write,
                    min: state.min,
                    max: state.max,
                    unit: state.unit,
                },
                native: {},
            });
        }

        // Audio commands/utilities
        await this.ensureObject('audio.commands', {
            type: 'channel',
            common: { name: 'Audio Commands' },
            native: {},
        });

        await this.ensureObject('audio.commands.resetPeaks', {
            type: 'state',
            common: {
                name: 'Reset Audio Peaks',
                type: 'boolean',
                role: 'button',
                read: false,
                write: true,
            },
            native: {},
        });

        // Audio inputs channel - will be populated dynamically
        await this.ensureObject('audio.inputs', {
            type: 'channel',
            common: { name: 'Audio Inputs' },
            native: {},
        });
    }

    private async createColorGeneratorStates(cgIndex: number): Promise<void> {
        const cgId = `colorGenerator${cgIndex}`;

        await this.ensureObject(cgId, {
            type: 'channel',
            common: { name: `Color Generator ${cgIndex + 1}` },
            native: {},
        });

        const cgStates = [
            {
                id: 'hue',
                name: 'Hue',
                type: 'number' as const,
                role: 'level.color.hue',
                write: true,
                min: 0,
                max: 3600,
                unit: '°',
            },
            {
                id: 'saturation',
                name: 'Saturation',
                type: 'number' as const,
                role: 'level.color.saturation',
                write: true,
                min: 0,
                max: 1000,
                unit: '%',
            },
            {
                id: 'luminance',
                name: 'Luminance',
                type: 'number' as const,
                role: 'level.color.luminance',
                write: true,
                min: 0,
                max: 1000,
                unit: '%',
            },
        ];

        for (const state of cgStates) {
            // setObjectAsync (not ensureObject) to force-refresh min/max on upgrade,
            // so def must be supplied explicitly here.
            await this.setObjectAsync(`${cgId}.${state.id}`, {
                type: 'state',
                common: {
                    name: state.name,
                    type: state.type,
                    role: state.role,
                    read: true,
                    write: state.write,
                    def: 0,
                    min: state.min,
                    max: state.max,
                    unit: state.unit,
                },
                native: {},
            });
        }
    }

    private async createStreamingStates(): Promise<void> {
        await this.ensureObject('streaming', {
            type: 'channel',
            common: { name: 'Streaming' },
            native: {},
        });

        await this.ensureObject('streaming.status', {
            type: 'state',
            common: {
                name: 'Streaming Status',
                type: 'number',
                role: 'value',
                read: true,
                write: false,
                states: { 0: 'Idle', 1: 'Connecting', 2: 'Streaming', 4: 'Stopping' },
            },
            native: {},
        });

        const streamingStates = [
            {
                id: 'start',
                name: 'Start Streaming',
                type: 'boolean' as const,
                role: 'button',
                write: true,
                read: false,
            },
            { id: 'stop', name: 'Stop Streaming', type: 'boolean' as const, role: 'button', write: true, read: false },
            {
                id: 'duration',
                name: 'Streaming Duration',
                type: 'number' as const,
                role: 'value.interval',
                write: false,
                read: true,
                unit: 's',
            },
            {
                id: 'cacheUsed',
                name: 'Cache Used',
                type: 'number' as const,
                role: 'value',
                write: false,
                read: true,
                unit: '%',
            },
        ];

        for (const state of streamingStates) {
            await this.ensureObject(`streaming.${state.id}`, {
                type: 'state',
                common: {
                    name: state.name,
                    type: state.type,
                    role: state.role,
                    read: state.read,
                    write: state.write,
                    unit: state.unit,
                },
                native: {},
            });
        }
    }

    private async createRecordingStates(): Promise<void> {
        await this.ensureObject('recording', {
            type: 'channel',
            common: { name: 'Recording' },
            native: {},
        });

        await this.ensureObject('recording.status', {
            type: 'state',
            common: {
                name: 'Recording Status',
                type: 'number',
                role: 'value',
                read: true,
                write: false,
                states: { 0: 'Idle', 1: 'Recording', 2: 'Stopping' },
            },
            native: {},
        });

        const recordingStates = [
            {
                id: 'start',
                name: 'Start Recording',
                type: 'boolean' as const,
                role: 'button',
                write: true,
                read: false,
            },
            { id: 'stop', name: 'Stop Recording', type: 'boolean' as const, role: 'button', write: true, read: false },
            {
                id: 'switchDisk',
                name: 'Switch Disk',
                type: 'boolean' as const,
                role: 'button',
                write: true,
                read: false,
            },
            {
                id: 'duration',
                name: 'Recording Duration',
                type: 'number' as const,
                role: 'value.interval',
                write: false,
                read: true,
                unit: 's',
            },
            {
                id: 'remainingDiskSpace',
                name: 'Remaining Disk Space',
                type: 'number' as const,
                role: 'value',
                write: false,
                read: true,
                unit: 's',
            },
        ];

        for (const state of recordingStates) {
            await this.ensureObject(`recording.${state.id}`, {
                type: 'state',
                common: {
                    name: state.name,
                    type: state.type,
                    role: state.role,
                    read: state.read,
                    write: state.write,
                    unit: state.unit,
                },
                native: {},
            });
        }
    }

    private async createMediaPlayerStates(mpIndex: number): Promise<void> {
        const mpId = `mediaPlayer${mpIndex}`;

        await this.ensureObject(mpId, {
            type: 'channel',
            common: { name: `Media Player ${mpIndex + 1}` },
            native: {},
        });

        // Source type: only show Clip option if model supports clips
        const sourceTypeStates: Record<number, string> = { 1: 'Still' };
        if (this.capabilities.mediaClips > 0) {
            sourceTypeStates[2] = 'Clip';
        }

        // Use setObject to fully replace sourceType (extendObject merges and won't remove old states entries)
        await this.setObjectAsync(`${mpId}.sourceType`, {
            type: 'state',
            common: {
                name: 'Source Type',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                def: 1,
                states: sourceTypeStates,
            },
            native: {},
        });

        // Still index with proper max based on model
        await this.setObjectAsync(`${mpId}.stillIndex`, {
            type: 'state',
            common: {
                name: 'Still Index',
                type: 'number',
                role: 'level',
                read: true,
                write: true,
                def: 0,
                min: 0,
                max: this.capabilities.mediaStills - 1,
            },
            native: {},
        });

        // Only create clip states if model supports clips, otherwise delete any existing clipIndex
        if (this.capabilities.mediaClips > 0) {
            await this.setObjectAsync(`${mpId}.clipIndex`, {
                type: 'state',
                common: {
                    name: 'Clip Index',
                    type: 'number',
                    role: 'level',
                    read: true,
                    write: true,
                    def: 0,
                    min: 0,
                    max: this.capabilities.mediaClips - 1,
                },
                native: {},
            });
        } else {
            // Delete any existing clipIndex using the same method that works for other orphaned objects
            await this.deleteObjectWithChildren(`${mpId}.clipIndex`);
        }

        const mpStates = [
            { id: 'playing', name: 'Playing', type: 'boolean' as const, role: 'media.state', write: true },
            { id: 'loop', name: 'Loop', type: 'boolean' as const, role: 'switch', write: true },
            { id: 'atBeginning', name: 'At Beginning', type: 'boolean' as const, role: 'indicator', write: false },
        ];

        for (const state of mpStates) {
            await this.ensureObject(`${mpId}.${state.id}`, {
                type: 'state',
                common: {
                    name: state.name,
                    type: state.type,
                    role: state.role,
                    read: true,
                    write: state.write,
                },
                native: {},
            });
        }
    }

    private async createTallyStates(): Promise<void> {
        await this.ensureObject('tally', {
            type: 'channel',
            common: { name: 'Tally Information' },
            native: {},
        });

        await this.ensureObject('tally.programInputs', {
            type: 'state',
            common: {
                name: 'Program Inputs',
                type: 'string',
                role: 'json',
                read: true,
                write: false,
                desc: 'JSON array of input IDs currently on program',
            },
            native: {},
        });

        await this.ensureObject('tally.previewInputs', {
            type: 'state',
            common: {
                name: 'Preview Inputs',
                type: 'string',
                role: 'json',
                read: true,
                write: false,
                desc: 'JSON array of input IDs currently on preview',
            },
            native: {},
        });
    }

    private async createMacroStates(): Promise<void> {
        // All ATEM models support 100 macro slots (0-99)
        const MACRO_SLOTS = 100;

        await this.ensureObject('macros', {
            type: 'channel',
            common: { name: 'Macros' },
            native: {},
        });

        const macroStates = [
            {
                id: 'run',
                name: 'Run Macro',
                type: 'number' as const,
                role: 'level',
                write: true,
                read: true,
                min: 0,
                max: 99,
                desc: 'Run macro by index (0-99)',
            },
            {
                id: 'stop',
                name: 'Stop Macro',
                type: 'boolean' as const,
                role: 'button',
                write: true,
                read: false,
                desc: 'Stop currently running macro',
            },
            {
                id: 'continue',
                name: 'Continue Macro',
                type: 'boolean' as const,
                role: 'button',
                write: true,
                read: false,
                desc: 'Continue a paused/waiting macro',
            },
            {
                id: 'isRunning',
                name: 'Macro Running',
                type: 'boolean' as const,
                role: 'indicator',
                write: false,
                read: true,
            },
            {
                id: 'isWaiting',
                name: 'Macro Waiting',
                type: 'boolean' as const,
                role: 'indicator',
                write: false,
                read: true,
            },
            { id: 'loop', name: 'Macro Loop', type: 'boolean' as const, role: 'switch', write: true, read: true },
            {
                id: 'runningIndex',
                name: 'Running Macro Index',
                type: 'number' as const,
                role: 'value',
                write: false,
                read: true,
            },
            {
                id: 'recordedCount',
                name: 'Recorded Macros Count',
                type: 'number' as const,
                role: 'value',
                write: false,
                read: true,
                desc: 'Number of recorded macros',
            },
        ];

        for (const state of macroStates) {
            await this.ensureObject(`macros.${state.id}`, {
                type: 'state',
                common: {
                    name: state.name,
                    type: state.type,
                    role: state.role,
                    read: state.read,
                    write: state.write,
                    min: state.min,
                    max: state.max,
                    desc: state.desc,
                },
                native: {},
            });
        }

        // Create channel for macro slots
        await this.ensureObject('macros.slots', {
            type: 'channel',
            common: { name: 'Macro Slots (0-99)' },
            native: {},
        });

        // Create states for each macro slot to show name and status
        for (let i = 0; i < MACRO_SLOTS; i++) {
            await this.ensureObject(`macros.slots.${i}`, {
                type: 'channel',
                common: { name: `Macro ${i}` },
                native: {},
            });

            await this.ensureObject(`macros.slots.${i}.name`, {
                type: 'state',
                common: { name: 'Macro Name', type: 'string', role: 'text', read: true, write: false },
                native: {},
            });

            await this.ensureObject(`macros.slots.${i}.isUsed`, {
                type: 'state',
                common: {
                    name: 'Macro Recorded',
                    type: 'boolean',
                    role: 'indicator',
                    read: true,
                    write: false,
                    desc: 'Whether a macro is recorded in this slot',
                },
                native: {},
            });

            await this.ensureObject(`macros.slots.${i}.trigger`, {
                type: 'state',
                common: {
                    name: 'Trigger Macro',
                    type: 'boolean',
                    role: 'button',
                    read: false,
                    write: true,
                    desc: 'Click to run this macro',
                },
                native: {},
            });
        }
    }

    /**
     * Connect to the ATEM device
     */
    private async connectAtem(): Promise<void> {
        if (this.isConnecting) {
            return;
        }

        this.isConnecting = true;

        try {
            this.atem = new Atem();

            this.atem.on('connected', async () => {
                this.log.info('Connected to ATEM');
                this.isConnecting = false;
                await this.setStateAsync('info.connection', true, true);

                // Update capabilities from actual device if auto-detect
                if (this.config.model === 'auto' && this.atem?.state) {
                    await this.updateCapabilitiesFromDevice();
                    // Re-create state structure with actual device capabilities
                    // This cleans up states that don't apply to the detected model
                    this.log.info('Rebuilding state structure based on detected device capabilities...');
                    await this.createStateStructure();
                    this.log.info('State structure rebuilt successfully');
                }

                await this.updateAllStates();
            });

            this.atem.on('disconnected', () => {
                this.log.warn('Disconnected from ATEM');
                void this.setStateAsync('info.connection', false, true);
                this.scheduleReconnect();
            });

            this.atem.on('error', (error: string) => {
                this.log.error(`ATEM error: ${error}`);
            });

            this.atem.on('stateChanged', (_state, pathToChange: string[]) => {
                this.handleStateChanged(pathToChange);
            });

            this.atem.on('info', (info: string) => {
                this.log.debug(`ATEM info: ${info}`);
            });

            this.log.info(`Connecting to ATEM at ${this.config.host}...`);
            await this.atem.connect(this.config.host);
        } catch (error) {
            this.isConnecting = false;
            this.log.error(`Failed to connect to ATEM: ${(error as Error).message}`);
            this.scheduleReconnect();
        }
    }

    private async updateCapabilitiesFromDevice(): Promise<void> {
        if (!this.atem?.state) {
            return;
        }

        const state = this.atem.state;

        // Update capabilities based on actual device
        const mediaPool = (state.info as any)?.mediaPool;
        this.capabilities = {
            mixEffectBlocks: state.video?.mixEffects?.length || 1,
            upstreamKeyers: state.video?.mixEffects?.[0]?.upstreamKeyers?.length || 1,
            downstreamKeyers: state.video?.downstreamKeyers?.length || 1,
            auxOutputs: Object.keys(state.video?.auxilliaries || {}).length,
            mediaPlayers: state.media?.players?.length || 1,
            mediaStills: mediaPool?.stillCount || state.media?.stillPool?.length || 20,
            mediaClips: mediaPool?.clipCount || state.media?.clipPool?.length || 0,
            colorGenerators: Object.keys(state.colorGenerators || {}).length || 2,
            superSources: state.video?.superSources?.length || 0,
            hasStreaming: !!state.streaming,
            hasRecording: !!state.recording,
            hasMultiview: (state.settings?.multiViewers?.length || 0) > 0,
            hasFairlightAudio: !!state.fairlight,
        };

        this.log.info(`Device capabilities detected: ${JSON.stringify(this.capabilities)}`);

        // Update capabilities state
        await this.setStateAsync('device.capabilities', JSON.stringify(this.capabilities), true);
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimeout) {
            this.clearTimeout(this.reconnectTimeout);
        }

        // Clamp defensively: UI limits (1000–60000ms) can be bypassed via direct
        // object edits, and setTimeout caps out at 2^31-1 ms.
        const MAX_TIMEOUT = 2_147_483_647;
        const interval = Math.min(Math.max(this.config.reconnectInterval || 5000, 1000), MAX_TIMEOUT);
        this.log.info(`Scheduling reconnect in ${interval}ms`);

        this.reconnectTimeout = this.setTimeout(() => {
            this.reconnectTimeout = undefined;
            this.isConnecting = false;
            void this.connectAtem();
        }, interval);
    }

    /**
     * Update all ioBroker states from ATEM state
     */
    private async updateAllStates(): Promise<void> {
        if (!this.atem || !this.atem.state) {
            return;
        }

        const state = this.atem.state;

        // Device info
        if (state.info) {
            await this.setStateAsync('device.modelName', state.info.model?.toString() || 'Unknown', true);
            await this.setStateAsync('device.productId', state.info.productIdentifier || 'Unknown', true);
        }

        // Video mode
        if (state.settings?.videoMode !== undefined) {
            await this.setStateAsync('device.videoMode', state.settings.videoMode.toString(), true);
        }

        // Mix Effects
        if (state.video?.mixEffects) {
            for (let i = 0; i < state.video.mixEffects.length && i < this.capabilities.mixEffectBlocks; i++) {
                await this.updateMixEffectStates(i);
            }
        }

        // Downstream Keyers
        await this.updateDSKStates();

        // Auxiliary outputs
        await this.updateAuxStates();

        // Audio
        await this.updateAudioStates();

        // Color Generators
        await this.updateColorGeneratorStates();

        // Streaming
        if (this.capabilities.hasStreaming) {
            await this.updateStreamingStates();
        }

        // Recording
        if (this.capabilities.hasRecording) {
            await this.updateRecordingStates();
        }

        // Media Players
        await this.updateMediaPlayerStates();

        // Macros
        await this.updateMacroStates();

        // Tally
        await this.updateTallyStates();

        // Input sources
        await this.updateInputStates();

        // Audio inputs
        await this.updateAudioInputStates();
    }

    private async updateMixEffectStates(meIndex: number): Promise<void> {
        if (!this.atem?.state?.video?.mixEffects?.[meIndex]) {
            return;
        }
        const me = this.atem.state.video.mixEffects[meIndex];
        const meId = `me${meIndex}`;

        await this.setStateAsync(`${meId}.programInput`, me.programInput || 0, true);
        await this.setStateAsync(`${meId}.previewInput`, me.previewInput || 0, true);
        await this.setStateAsync(`${meId}.inTransition`, me.transitionPosition?.inTransition || false, true);
        await this.setStateAsync(`${meId}.transitionPosition`, me.transitionPosition?.handlePosition || 0, true);
        await this.setStateAsync(
            `${meId}.transitionFramesRemaining`,
            me.transitionPosition?.remainingFrames || 0,
            true,
        );

        // Transition settings
        if (me.transitionProperties) {
            await this.setStateAsync(`${meId}.transition.style`, me.transitionProperties.nextStyle || 0, true);
        }

        if (me.transitionSettings) {
            if (me.transitionSettings.mix) {
                await this.setStateAsync(`${meId}.transition.mixRate`, me.transitionSettings.mix.rate || 30, true);
            }
            if (me.transitionSettings.dip) {
                await this.setStateAsync(`${meId}.transition.dipRate`, me.transitionSettings.dip.rate || 30, true);
                await this.setStateAsync(`${meId}.transition.dipSource`, me.transitionSettings.dip.input || 0, true);
            }
            if (me.transitionSettings.wipe) {
                await this.setStateAsync(`${meId}.transition.wipeRate`, me.transitionSettings.wipe.rate || 30, true);
                await this.setStateAsync(
                    `${meId}.transition.wipePattern`,
                    me.transitionSettings.wipe.pattern || 0,
                    true,
                );
            }
            if (me.transitionSettings.DVE) {
                await this.setStateAsync(`${meId}.transition.dveRate`, me.transitionSettings.DVE.rate || 30, true);
            }
        }

        // Fade to Black
        if (me.fadeToBlack) {
            await this.setStateAsync(`${meId}.fadeToBlack.isFullyBlack`, me.fadeToBlack.isFullyBlack || false, true);
            await this.setStateAsync(`${meId}.fadeToBlack.inTransition`, me.fadeToBlack.inTransition || false, true);
            await this.setStateAsync(`${meId}.fadeToBlack.rate`, me.fadeToBlack.rate || 30, true);
        }

        // Upstream Keyers
        if (me.upstreamKeyers) {
            for (let i = 0; i < me.upstreamKeyers.length && i < this.capabilities.upstreamKeyers; i++) {
                const usk = me.upstreamKeyers[i];
                if (usk) {
                    await this.setStateAsync(`${meId}.usk${i}.onAir`, usk.onAir || false, true);
                    await this.setStateAsync(`${meId}.usk${i}.type`, usk.mixEffectKeyType || 0, true);
                    await this.setStateAsync(`${meId}.usk${i}.fillSource`, usk.fillSource || 0, true);
                    await this.setStateAsync(`${meId}.usk${i}.keySource`, usk.cutSource || 0, true);
                    await this.setStateAsync(
                        `${meId}.usk${i}.maskEnabled`,
                        usk.maskSettings?.maskEnabled || false,
                        true,
                    );
                    await this.setStateAsync(`${meId}.usk${i}.flyEnabled`, usk.flyEnabled || false, true);
                }
            }
        }
    }

    private async updateDSKStates(): Promise<void> {
        if (!this.atem?.state?.video?.downstreamKeyers) {
            return;
        }

        for (
            let i = 0;
            i < this.atem.state.video.downstreamKeyers.length && i < this.capabilities.downstreamKeyers;
            i++
        ) {
            const dsk = this.atem.state.video.downstreamKeyers[i];
            if (dsk) {
                await this.setStateAsync(`dsk${i}.onAir`, dsk.onAir || false, true);
                await this.setStateAsync(`dsk${i}.tie`, dsk.properties?.tie || false, true);
                await this.setStateAsync(`dsk${i}.inTransition`, dsk.inTransition || false, true);
                await this.setStateAsync(`dsk${i}.rate`, dsk.properties?.rate || 30, true);
                await this.setStateAsync(`dsk${i}.fillSource`, dsk.sources?.fillSource || 0, true);
                await this.setStateAsync(`dsk${i}.keySource`, dsk.sources?.cutSource || 0, true);
                await this.setStateAsync(`dsk${i}.preMultiplied`, dsk.properties?.preMultiply || false, true);
            }
        }
    }

    private async updateAuxStates(): Promise<void> {
        if (!this.atem?.state?.video?.auxilliaries) {
            return;
        }

        const auxOutputs = this.atem.state.video.auxilliaries;
        for (const [auxIndex, source] of Object.entries(auxOutputs)) {
            const index = parseInt(auxIndex);
            if (index < this.capabilities.auxOutputs) {
                await this.setStateAsync(`aux${index}.source`, source || 0, true);
            }
        }
    }

    private async updateAudioStates(): Promise<void> {
        if (this.atem?.state?.audio?.master) {
            await this.setStateAsync('audio.master.gain', this.atem.state.audio.master.gain || 0, true);
            await this.setStateAsync('audio.master.balance', this.atem.state.audio.master.balance || 0, true);
            await this.setStateAsync('audio.master.afv', this.atem.state.audio.master.followFadeToBlack || false, true);
        }

        // Also check Fairlight audio if available
        if (this.atem?.state?.fairlight?.master) {
            const master = this.atem.state.fairlight.master;
            if (master.properties?.faderGain !== undefined) {
                await this.setStateAsync('audio.master.gain', master.properties.faderGain, true);
            }
            if (master.properties?.followFadeToBlack !== undefined) {
                await this.setStateAsync('audio.master.afv', master.properties.followFadeToBlack, true);
            }
        }

        // Audio Follow Video Crossfade (check both Classic and Fairlight)
        if (this.atem?.state?.audio?.audioFollowVideoCrossfadeTransitionEnabled !== undefined) {
            await this.setStateAsync(
                'audio.master.afvCrossfade',
                this.atem.state.audio.audioFollowVideoCrossfadeTransitionEnabled,
                true,
            );
        }

        if (this.atem?.state?.fairlight?.audioFollowVideoCrossfadeTransitionEnabled !== undefined) {
            await this.setStateAsync(
                'audio.master.afvCrossfade',
                this.atem.state.fairlight.audioFollowVideoCrossfadeTransitionEnabled,
                true,
            );
        }

        // Update monitor states (Classic Audio)
        if (this.atem?.state?.audio?.monitor) {
            const monitor = this.atem.state.audio.monitor;
            await this.setStateAsync('audio.monitor.enabled', monitor.enabled || false, true);
            await this.setStateAsync('audio.monitor.gain', monitor.gain || 0, true);
            await this.setStateAsync('audio.monitor.mute', monitor.mute || false, true);
            await this.setStateAsync('audio.monitor.solo', monitor.solo || false, true);
            await this.setStateAsync('audio.monitor.dim', monitor.dim || false, true);
        }

        // Update Fairlight monitor if available
        if (this.capabilities.hasFairlightAudio && this.atem?.state?.fairlight?.monitor) {
            const monitor = this.atem.state.fairlight.monitor;
            if (monitor.gain !== undefined) {
                await this.setStateAsync('audio.monitor.gain', monitor.gain, true);
            }
            if (monitor.inputMasterMuted !== undefined) {
                await this.setStateAsync('audio.monitor.mute', monitor.inputMasterMuted, true);
            }
        }
    }

    private async updateColorGeneratorStates(): Promise<void> {
        if (!this.atem?.state?.colorGenerators) {
            return;
        }

        for (const [index, cg] of Object.entries(this.atem.state.colorGenerators)) {
            const cgIndex = parseInt(index);
            if (cgIndex < this.capabilities.colorGenerators && cg) {
                await this.setStateAsync(`colorGenerator${cgIndex}.hue`, cg.hue || 0, true);
                await this.setStateAsync(`colorGenerator${cgIndex}.saturation`, cg.saturation || 0, true);
                await this.setStateAsync(`colorGenerator${cgIndex}.luminance`, cg.luma || 0, true);
            }
        }
    }

    private async updateStreamingStates(): Promise<void> {
        if (!this.atem?.state?.streaming) {
            return;
        }
        const streaming = this.atem.state.streaming;

        if (streaming.status) {
            await this.setStateAsync('streaming.status', streaming.status.state || 0, true);
        }
        if (streaming.duration) {
            const duration = this.timecodeToSeconds(streaming.duration);
            await this.setStateAsync('streaming.duration', duration, true);
        }
        if (streaming.stats?.encodingBitrate !== undefined) {
            await this.setStateAsync('streaming.cacheUsed', streaming.stats.cacheUsed || 0, true);
        }
    }

    private async updateRecordingStates(): Promise<void> {
        if (!this.atem?.state?.recording) {
            return;
        }
        const recording = this.atem.state.recording;

        if (recording.status) {
            await this.setStateAsync('recording.status', recording.status.state || 0, true);
        }
        if (recording.duration) {
            const duration = this.timecodeToSeconds(recording.duration);
            await this.setStateAsync('recording.duration', duration, true);
        }
        // Get remaining disk space from first disk if available
        const disks = recording.disks;
        if (disks) {
            for (const disk of Object.values(disks)) {
                if (disk && disk.recordingTimeAvailable !== undefined) {
                    await this.setStateAsync('recording.remainingDiskSpace', disk.recordingTimeAvailable, true);
                    break;
                }
            }
        }
    }

    private async updateMediaPlayerStates(): Promise<void> {
        if (!this.atem?.state?.media?.players) {
            return;
        }

        for (let i = 0; i < this.atem.state.media.players.length && i < this.capabilities.mediaPlayers; i++) {
            const mp = this.atem.state.media.players[i];
            if (mp) {
                await this.setStateAsync(`mediaPlayer${i}.sourceType`, mp.sourceType || 1, true);
                await this.setStateAsync(`mediaPlayer${i}.stillIndex`, mp.stillIndex || 0, true);
                if (this.capabilities.mediaClips > 0) {
                    await this.setStateAsync(`mediaPlayer${i}.clipIndex`, mp.clipIndex || 0, true);
                }
                await this.setStateAsync(`mediaPlayer${i}.playing`, mp.playing || false, true);
                await this.setStateAsync(`mediaPlayer${i}.loop`, mp.loop || false, true);
                await this.setStateAsync(`mediaPlayer${i}.atBeginning`, mp.atBeginning || false, true);
            }
        }
    }

    private async updateMacroStates(): Promise<void> {
        if (!this.atem?.state?.macro) {
            return;
        }

        // Update macro player state
        const player = this.atem.state.macro.macroPlayer;
        if (player) {
            await this.setStateAsync('macros.isRunning', player.isRunning || false, true);
            await this.setStateAsync('macros.isWaiting', player.isWaiting || false, true);
            await this.setStateAsync('macros.loop', player.loop || false, true);
            await this.setStateAsync('macros.runningIndex', player.macroIndex || 0, true);
        }

        // Update macro slot properties (names and used status)
        const macroProps = this.atem.state.macro.macroProperties;
        if (macroProps) {
            let recordedCount = 0;
            for (const [index, props] of Object.entries(macroProps)) {
                if (props) {
                    const slotIndex = parseInt(index);
                    await this.setStateAsync(`macros.slots.${slotIndex}.name`, props.name || '', true);
                    await this.setStateAsync(`macros.slots.${slotIndex}.isUsed`, props.isUsed || false, true);
                    if (props.isUsed) {
                        recordedCount++;
                    }
                }
            }
            await this.setStateAsync('macros.recordedCount', recordedCount, true);
        }
    }

    private async updateTallyStates(): Promise<void> {
        if (!this.atem?.state?.video?.mixEffects) {
            return;
        }

        const programInputs: number[] = [];
        const previewInputs: number[] = [];

        // Collect tally from all mix effects
        for (const me of this.atem.state.video.mixEffects) {
            if (me) {
                if (me.programInput) {
                    programInputs.push(me.programInput);
                }
                if (me.previewInput) {
                    previewInputs.push(me.previewInput);
                }
            }
        }

        await this.setStateAsync('tally.programInputs', JSON.stringify(programInputs), true);
        await this.setStateAsync('tally.previewInputs', JSON.stringify(previewInputs), true);
    }

    private async updateInputStates(): Promise<void> {
        if (!this.atem?.state?.inputs) {
            return;
        }

        for (const [inputId, input] of Object.entries(this.atem.state.inputs)) {
            if (!input) {
                continue;
            }

            const stateId = `inputs.input${inputId}`;

            await this.ensureObject(stateId, {
                type: 'channel',
                common: { name: input.longName || `Input ${inputId}` },
                native: {},
            });

            const inputStates = [
                { id: 'shortName', value: input.shortName || '', role: 'text' },
                { id: 'longName', value: input.longName || '', role: 'text' },
                { id: 'inputId', value: parseInt(inputId), role: 'value' },
                { id: 'portType', value: input.externalPortType || 0, role: 'value' },
            ];

            for (const state of inputStates) {
                await this.ensureObject(`${stateId}.${state.id}`, {
                    type: 'state',
                    common: {
                        name: state.id.charAt(0).toUpperCase() + state.id.slice(1).replace(/([A-Z])/g, ' $1'),
                        type: typeof state.value as 'string' | 'number' | 'boolean',
                        role: state.role,
                        read: true,
                        write: false,
                    },
                    native: {},
                });
                await this.setStateAsync(`${stateId}.${state.id}`, state.value, true);
            }
        }
    }

    private async updateAudioInputStates(): Promise<void> {
        // Classic audio mixer inputs
        if (this.atem?.state?.audio?.channels) {
            for (const [inputId, channel] of Object.entries(this.atem.state.audio.channels)) {
                if (!channel) {
                    continue;
                }

                const stateId = `audio.inputs.input${inputId}`;

                await this.ensureObject(stateId, {
                    type: 'channel',
                    common: { name: `Audio Input ${inputId}` },
                    native: {},
                });

                const channelStates = [
                    { id: 'gain', name: 'Gain', type: 'number' as const, value: channel.gain || 0, unit: 'dB' },
                    { id: 'balance', name: 'Balance', type: 'number' as const, value: channel.balance || 0 },
                    { id: 'mixOption', name: 'Mix Option', type: 'number' as const, value: channel.mixOption || 0 },
                ];

                for (const state of channelStates) {
                    await this.ensureObject(`${stateId}.${state.id}`, {
                        type: 'state',
                        common: {
                            name: state.name,
                            type: state.type,
                            role: 'level',
                            read: true,
                            write: true,
                            unit: state.unit,
                        },
                        native: {},
                    });
                    await this.setStateAsync(`${stateId}.${state.id}`, state.value, true);
                }
            }
        }
    }

    private timecodeToSeconds(timecode: { hours: number; minutes: number; seconds: number; frames: number }): number {
        return timecode.hours * 3600 + timecode.minutes * 60 + timecode.seconds;
    }

    /**
     * Handle ATEM state changes
     *
     * @param pathToChange Path segments of the ATEM state that changed
     */
    private handleStateChanged(pathToChange: string[]): void {
        const path = pathToChange.join('.');
        this.log.debug(`ATEM state changed: ${path}`);

        // Update specific states based on path
        if (path.startsWith('video.mixEffects.')) {
            const meIndex = parseInt(pathToChange[2]) || 0;
            void this.updateMixEffectStates(meIndex);
        } else if (path.startsWith('video.downstreamKeyers')) {
            void this.updateDSKStates();
        } else if (path.startsWith('video.auxilliaries')) {
            void this.updateAuxStates();
        } else if (path.startsWith('audio') || path.startsWith('fairlight')) {
            void this.updateAudioStates();
        } else if (path.startsWith('colorGenerators')) {
            void this.updateColorGeneratorStates();
        } else if (path.startsWith('streaming')) {
            void this.updateStreamingStates();
        } else if (path.startsWith('recording')) {
            void this.updateRecordingStates();
        } else if (path.startsWith('media.players')) {
            void this.updateMediaPlayerStates();
        } else if (path.startsWith('macro')) {
            void this.updateMacroStates();
        } else if (path.startsWith('inputs')) {
            void this.updateInputStates();
        }

        // Always update tally on video changes
        if (path.startsWith('video')) {
            void this.updateTallyStates();
        }
    }

    /**
     * Handle state changes from ioBroker (user commands)
     *
     * @param id Full state id (with namespace) that changed
     * @param state New state value, or null/undefined when the state was deleted
     */
    private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
        if (!state || state.ack) {
            return;
        }

        if (!this.atem || this.atem.status !== AtemConnectionStatus.CONNECTED) {
            this.log.warn('Cannot process state change - not connected to ATEM');
            return;
        }

        const stateId = id.split('.').slice(2).join('.');
        this.log.debug(`State change: ${stateId} = ${state.val}`);

        try {
            await this.processCommand(stateId, state.val);
        } catch (error) {
            this.log.error(`Error processing command ${stateId}: ${(error as Error).message}`);
        }
    }

    /**
     * Process commands sent via state changes
     *
     * @param stateId Relative state id (without namespace) being written
     * @param value Value written to the state
     */
    private async processCommand(stateId: string, value: ioBroker.StateValue): Promise<void> {
        if (!this.atem) {
            return;
        }

        // Parse the state path
        const parts = stateId.split('.');

        // Commands
        if (stateId === 'commands.cut') {
            await this.atem.cut(0);
            this.log.info('Executed CUT');
        } else if (stateId === 'commands.auto') {
            await this.atem.autoTransition(0);
            this.log.info('Executed AUTO transition');
        } else if (stateId === 'commands.ftb') {
            await this.atem.fadeToBlack(0);
            this.log.info('Executed Fade to Black');
        } else if (parts[0].startsWith('me') && !parts[0].startsWith('media')) {
            const meIndex = parseInt(parts[0].substring(2)) || 0;
            await this.processMECommand(meIndex, parts.slice(1), value);
        } else if (parts[0].startsWith('dsk')) {
            const dskIndex = parseInt(parts[0].substring(3)) || 0;
            await this.processDSKCommand(dskIndex, parts[1], value);
        } else if (parts[0].startsWith('aux')) {
            const auxIndex = parseInt(parts[0].substring(3)) || 0;
            if (parts[1] === 'source') {
                await this.atem.setAuxSource(Number(value), auxIndex);
                this.log.info(`Set Aux ${auxIndex + 1} source to ${value}`);
            }
        } else if (parts[0] === 'audio') {
            await this.processAudioCommand(parts.slice(1), value);
        } else if (parts[0].startsWith('colorGenerator')) {
            const cgIndex = parseInt(parts[0].substring(14)) || 0;
            await this.processColorGeneratorCommand(cgIndex, parts[1], value);
        } else if (stateId === 'streaming.start') {
            await this.atem.startStreaming();
            this.log.info('Started streaming');
        } else if (stateId === 'streaming.stop') {
            await this.atem.stopStreaming();
            this.log.info('Stopped streaming');
        } else if (stateId === 'recording.start') {
            await this.atem.startRecording();
            this.log.info('Started recording');
        } else if (stateId === 'recording.stop') {
            await this.atem.stopRecording();
            this.log.info('Stopped recording');
        } else if (stateId === 'recording.switchDisk') {
            await this.atem.switchRecordingDisk();
            this.log.info('Switched recording disk');
        } else if (parts[0].startsWith('mediaPlayer')) {
            const mpIndex = parseInt(parts[0].substring(11)) || 0;
            await this.processMediaPlayerCommand(mpIndex, parts[1], value);
        } else if (stateId === 'macros.run') {
            await this.atem.macroRun(Number(value));
            this.log.info(`Running macro ${value}`);
        } else if (stateId === 'macros.stop') {
            await this.atem.macroStop();
            this.log.info('Stopped macro');
        } else if (stateId === 'macros.continue') {
            await this.atem.macroContinue();
            this.log.info('Continued macro');
        } else if (stateId === 'macros.loop') {
            await this.atem.macroSetLoop(Boolean(value));
            this.log.info(`Set macro loop: ${value}`);
        } else if (parts[0] === 'macros' && parts[1] === 'slots' && parts[3] === 'trigger') {
            // Handle macros.slots.X.trigger
            const macroIndex = parseInt(parts[2]);
            if (!isNaN(macroIndex) && macroIndex >= 0 && macroIndex <= 99) {
                await this.atem.macroRun(macroIndex);
                this.log.info(`Running macro ${macroIndex} via trigger button`);
            }
        }
    }

    private async processMECommand(meIndex: number, parts: string[], value: ioBroker.StateValue): Promise<void> {
        if (!this.atem) {
            return;
        }

        if (parts[0] === 'programInput') {
            await this.atem.changeProgramInput(Number(value), meIndex);
            this.log.info(`Set ME${meIndex + 1} program input to ${value}`);
        } else if (parts[0] === 'previewInput') {
            await this.atem.changePreviewInput(Number(value), meIndex);
            this.log.info(`Set ME${meIndex + 1} preview input to ${value}`);
        } else if (parts[0] === 'transitionPosition') {
            await this.atem.setTransitionPosition(Number(value), meIndex);
        } else if (parts[0] === 'transition') {
            if (parts[1] === 'style') {
                await this.atem.setTransitionStyle({ nextStyle: Number(value) }, meIndex);
                this.log.info(`Set ME${meIndex + 1} transition style to ${value}`);
            } else if (parts[1] === 'mixRate') {
                await this.atem.setMixTransitionSettings({ rate: Number(value) }, meIndex);
                this.log.info(`Set ME${meIndex + 1} mix rate to ${value}`);
            } else if (parts[1] === 'dipRate') {
                await this.atem.setDipTransitionSettings({ rate: Number(value) }, meIndex);
                this.log.info(`Set ME${meIndex + 1} dip rate to ${value}`);
            } else if (parts[1] === 'dipSource') {
                await this.atem.setDipTransitionSettings({ input: Number(value) }, meIndex);
                this.log.info(`Set ME${meIndex + 1} dip source to ${value}`);
            } else if (parts[1] === 'wipeRate') {
                await this.atem.setWipeTransitionSettings({ rate: Number(value) }, meIndex);
                this.log.info(`Set ME${meIndex + 1} wipe rate to ${value}`);
            } else if (parts[1] === 'wipePattern') {
                await this.atem.setWipeTransitionSettings({ pattern: Number(value) }, meIndex);
                this.log.info(`Set ME${meIndex + 1} wipe pattern to ${value}`);
            } else if (parts[1] === 'dveRate') {
                await this.atem.setDVETransitionSettings({ rate: Number(value) }, meIndex);
                this.log.info(`Set ME${meIndex + 1} DVE rate to ${value}`);
            }
        } else if (parts[0] === 'fadeToBlack' && parts[1] === 'rate') {
            await this.atem.setFadeToBlackRate(Number(value), meIndex);
            this.log.info(`Set ME${meIndex + 1} FTB rate to ${value}`);
        } else if (parts[0].startsWith('usk')) {
            const uskIndex = parseInt(parts[0].substring(3)) || 0;
            await this.processUSKCommand(meIndex, uskIndex, parts[1], value);
        }
    }

    private async processUSKCommand(
        meIndex: number,
        uskIndex: number,
        property: string,
        value: ioBroker.StateValue,
    ): Promise<void> {
        if (!this.atem) {
            return;
        }

        if (property === 'onAir') {
            await this.atem.setUpstreamKeyerOnAir(Boolean(value), meIndex, uskIndex);
            this.log.info(`Set ME${meIndex + 1} USK${uskIndex + 1} on air: ${value}`);
        } else if (property === 'type') {
            await this.atem.setUpstreamKeyerType({ mixEffectKeyType: Number(value) }, meIndex, uskIndex);
            this.log.info(`Set ME${meIndex + 1} USK${uskIndex + 1} type: ${value}`);
        } else if (property === 'fillSource') {
            await this.atem.setUpstreamKeyerFillSource(Number(value), meIndex, uskIndex);
            this.log.info(`Set ME${meIndex + 1} USK${uskIndex + 1} fill source: ${value}`);
        } else if (property === 'keySource') {
            await this.atem.setUpstreamKeyerCutSource(Number(value), meIndex, uskIndex);
            this.log.info(`Set ME${meIndex + 1} USK${uskIndex + 1} key source: ${value}`);
        } else if (property === 'maskEnabled') {
            await this.atem.setUpstreamKeyerMaskSettings({ maskEnabled: Boolean(value) }, meIndex, uskIndex);
            this.log.info(`Set ME${meIndex + 1} USK${uskIndex + 1} mask enabled: ${value}`);
        } else if (property === 'flyEnabled') {
            await this.atem.setUpstreamKeyerType({ flyEnabled: Boolean(value) }, meIndex, uskIndex);
            this.log.info(`Set ME${meIndex + 1} USK${uskIndex + 1} fly enabled: ${value}`);
        }
    }

    private async processDSKCommand(dskIndex: number, property: string, value: ioBroker.StateValue): Promise<void> {
        if (!this.atem) {
            return;
        }

        if (property === 'onAir') {
            await this.atem.setDownstreamKeyOnAir(Boolean(value), dskIndex);
            this.log.info(`Set DSK${dskIndex + 1} on air: ${value}`);
        } else if (property === 'tie') {
            await this.atem.setDownstreamKeyTie(Boolean(value), dskIndex);
            this.log.info(`Set DSK${dskIndex + 1} tie: ${value}`);
        } else if (property === 'rate') {
            await this.atem.setDownstreamKeyRate(Number(value), dskIndex);
            this.log.info(`Set DSK${dskIndex + 1} rate: ${value}`);
        } else if (property === 'auto') {
            await this.atem.autoDownstreamKey(dskIndex);
            this.log.info(`Auto DSK${dskIndex + 1}`);
        } else if (property === 'fillSource') {
            await this.atem.setDownstreamKeyFillSource(Number(value), dskIndex);
            this.log.info(`Set DSK${dskIndex + 1} fill source: ${value}`);
        } else if (property === 'keySource') {
            await this.atem.setDownstreamKeyCutSource(Number(value), dskIndex);
            this.log.info(`Set DSK${dskIndex + 1} key source: ${value}`);
        } else if (property === 'preMultiplied') {
            await this.atem.setDownstreamKeyGeneralProperties({ preMultiply: Boolean(value) }, dskIndex);
            this.log.info(`Set DSK${dskIndex + 1} pre-multiplied: ${value}`);
        }
    }

    private async processAudioCommand(parts: string[], value: ioBroker.StateValue): Promise<void> {
        if (!this.atem) {
            return;
        }

        if (parts[0] === 'master') {
            if (parts[1] === 'gain') {
                // Handle both Classic and Fairlight audio
                if (this.capabilities.hasFairlightAudio && this.atem.state?.fairlight?.master) {
                    await this.atem.setFairlightAudioMixerMasterProps({ faderGain: Number(value) });
                    this.log.info(`Set Fairlight master audio gain: ${value}`);
                } else {
                    await this.atem.setClassicAudioMixerMasterProps({ gain: Number(value) });
                    this.log.info(`Set Classic master audio gain: ${value}`);
                }
            } else if (parts[1] === 'balance') {
                await this.atem.setClassicAudioMixerMasterProps({ balance: Number(value) });
                this.log.info(`Set master audio balance: ${value}`);
            } else if (parts[1] === 'afv') {
                // Handle both Classic and Fairlight audio
                if (this.capabilities.hasFairlightAudio && this.atem.state?.fairlight?.master) {
                    await this.atem.setFairlightAudioMixerMasterProps({ followFadeToBlack: Boolean(value) });
                    this.log.info(`Set Fairlight AFV (Audio Follow Video): ${value}`);
                } else {
                    await this.atem.setClassicAudioMixerMasterProps({ followFadeToBlack: Boolean(value) });
                    this.log.info(`Set Classic AFV (Audio Follow Video): ${value}`);
                }
            } else if (parts[1] === 'afvCrossfade') {
                await this.atem.setClassicAudioMixerProps({
                    audioFollowVideo: Boolean(value),
                });
                this.log.info(`Set AFV Crossfade Transition: ${value}`);
            }
        } else if (parts[0] === 'monitor') {
            if (this.capabilities.hasFairlightAudio) {
                // Fairlight monitor controls (simplified - only gain and mute)
                const props: any = {};
                if (parts[1] === 'gain') {
                    props.gain = Number(value);
                } else if (parts[1] === 'mute') {
                    props.inputMasterMuted = Boolean(value);
                }

                if (Object.keys(props).length > 0) {
                    await this.atem.setFairlightAudioMixerMonitorProps(props);
                    this.log.info(`Set Fairlight monitor ${parts[1]}: ${value}`);
                }
            } else {
                // Classic audio monitor controls (full set)
                const props: any = {};
                if (parts[1] === 'enabled') {
                    props.enabled = Boolean(value);
                } else if (parts[1] === 'gain') {
                    props.gain = Number(value);
                } else if (parts[1] === 'mute') {
                    props.mute = Boolean(value);
                } else if (parts[1] === 'solo') {
                    props.solo = Boolean(value);
                } else if (parts[1] === 'dim') {
                    props.dim = Boolean(value);
                }

                if (Object.keys(props).length > 0) {
                    await this.atem.setClassicAudioMixerMonitorProps(props);
                    this.log.info(`Set Classic monitor ${parts[1]}: ${value}`);
                }
            }
        } else if (parts[0] === 'commands' && parts[1] === 'resetPeaks') {
            if (this.capabilities.hasFairlightAudio) {
                // Reset all Fairlight peaks
                await this.atem.setFairlightAudioMixerResetPeaks({
                    all: true,
                    master: true,
                });
                this.log.info('Reset all Fairlight audio peaks');
            } else {
                // Reset all Classic audio peaks
                await this.atem.setClassicAudioResetPeaks({
                    all: true,
                    master: true,
                });
                this.log.info('Reset all Classic audio peaks');
            }
            // Reset button state back to false
            await this.setStateAsync('audio.commands.resetPeaks', false, true);
        } else if (parts[0] === 'inputs' && parts[1].startsWith('input')) {
            const inputId = parseInt(parts[1].substring(5));
            if (parts[2] === 'gain') {
                await this.atem.setClassicAudioMixerInputProps(inputId, { gain: Number(value) });
                this.log.info(`Set audio input ${inputId} gain: ${value}`);
            } else if (parts[2] === 'balance') {
                await this.atem.setClassicAudioMixerInputProps(inputId, { balance: Number(value) });
                this.log.info(`Set audio input ${inputId} balance: ${value}`);
            } else if (parts[2] === 'mixOption') {
                await this.atem.setClassicAudioMixerInputProps(inputId, { mixOption: Number(value) });
                this.log.info(`Set audio input ${inputId} mix option: ${value}`);
            }
        }
    }

    private async processColorGeneratorCommand(
        cgIndex: number,
        property: string,
        value: ioBroker.StateValue,
    ): Promise<void> {
        if (!this.atem) {
            return;
        }

        const currentCg = this.atem.state?.colorGenerators?.[cgIndex];
        const hue = property === 'hue' ? Number(value) : currentCg?.hue || 0;
        const saturation = property === 'saturation' ? Number(value) : currentCg?.saturation || 0;
        const luma = property === 'luminance' ? Number(value) : currentCg?.luma || 0;

        await this.atem.setColorGeneratorColour({ hue, saturation, luma }, cgIndex);
        this.log.info(`Set color generator ${cgIndex + 1} ${property}: ${value}`);
    }

    private async processMediaPlayerCommand(
        mpIndex: number,
        property: string,
        value: ioBroker.StateValue,
    ): Promise<void> {
        if (!this.atem) {
            return;
        }

        if (property === 'sourceType') {
            const newType = Number(value);
            if (newType === 2 && this.capabilities.mediaClips === 0) {
                this.log.warn(`Media player ${mpIndex + 1}: Clip source type not supported on this model`);
                return;
            }
            await this.atem.setMediaPlayerSource({ sourceType: newType }, mpIndex);
            this.log.info(`Set media player ${mpIndex + 1} source type: ${value}`);
        } else if (property === 'stillIndex') {
            await this.atem.setMediaPlayerSource({ sourceType: 1, stillIndex: Number(value) }, mpIndex);
            this.log.info(`Set media player ${mpIndex + 1} still index: ${value}`);
        } else if (property === 'clipIndex') {
            if (this.capabilities.mediaClips === 0) {
                this.log.warn(`Media player ${mpIndex + 1}: Clips not supported on this model`);
                return;
            }
            await this.atem.setMediaPlayerSource({ sourceType: 2, clipIndex: Number(value) }, mpIndex);
            this.log.info(`Set media player ${mpIndex + 1} clip index: ${value}`);
        } else if (property === 'playing') {
            await this.atem.setMediaPlayerSettings({ playing: Boolean(value) }, mpIndex);
            this.log.info(`Set media player ${mpIndex + 1} playing: ${value}`);
        } else if (property === 'loop') {
            await this.atem.setMediaPlayerSettings({ loop: Boolean(value) }, mpIndex);
            this.log.info(`Set media player ${mpIndex + 1} loop: ${value}`);
        }
    }

    /**
     * Called when adapter is shutting down
     *
     * @param callback Must be invoked once cleanup is complete to signal shutdown
     */
    private onUnload(callback: () => void): void {
        try {
            if (this.reconnectTimeout) {
                this.clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = undefined;
            }

            if (this.atem) {
                void this.atem.disconnect();
                this.atem = null;
            }

            callback();
        } catch {
            callback();
        }
    }
}

// Create adapter instance
if (require.main !== module) {
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new AtemAdapter(options);
} else {
    (() => new AtemAdapter())();
}
