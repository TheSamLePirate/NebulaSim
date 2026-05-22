import { useEffect, useRef, useState } from 'react';
import { Body } from '../types';

export const useRocketSound = (bodies: Body[]) => {
    const audioContextRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const filterNodeRef = useRef<BiquadFilterNode | null>(null);
    const isInitializedRef = useRef(false);
    
    // Track previous states for beep detection
    const prevManeuversRef = useRef<Map<string, string>>(new Map()); // rocketId -> active maneuver type
    const prevSASModeRef = useRef<Map<string, string>>(new Map()); // rocketId -> SAS mode
    const lowAltitudeBeepingRef = useRef<Map<string, boolean>>(new Map()); // rocketId -> is beeping
    const lastBeepTimeRef = useRef<number>(0);
    const prevRocketIdsRef = useRef<Set<string>>(new Set()); // Track which rockets existed last frame
    const prevLandedStatusRef = useRef<Map<string, boolean>>(new Map()); // rocketId -> was landed

    const [audioState, setAudioState] = useState<AudioContextState | 'uninitialized'>('uninitialized');

    const [isReady, setIsReady] = useState(false);

    const silentAudioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize Audio Context lazily on user interaction
    useEffect(() => {
        const initAudio = () => {
            if (isInitializedRef.current) {
                // If already initialized, just ensure it's running
                if (audioContextRef.current?.state === 'suspended') {
                    audioContextRef.current.resume().then(() => {
                        console.log('AudioContext resumed via interaction');
                        setAudioState('running');
                    });
                }
                // Ensure silent audio is playing (for silent switch bypass)
                if (silentAudioRef.current && silentAudioRef.current.paused) {
                    silentAudioRef.current.play().catch(() => {});
                }
                return;
            }

            const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
            if (!AudioContextClass) return;

            // Create context ONLY after user interaction
            const ctx = new AudioContextClass({ latencyHint: 'interactive' });
            audioContextRef.current = ctx;
            setAudioState(ctx.state);

            // Update state listener
            ctx.addEventListener('statechange', () => {
                setAudioState(ctx.state);
            });

            // 1. Resume if suspended (just in case)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            // 2. Play silent HTML5 Audio (Bypass iPhone Silent Switch)
            try {
                if (!silentAudioRef.current) {
                    // Silent MP3
                    const silentAudio = new Audio('data:audio/mpeg;base64,SUQzBAAAAAABAFRYWFgAAAASAAADbWFqb3JfYnJhbmQAbXA0MgBUWFhYAAAAEQAAA21pbm9yX3ZlcnNpb24AMABUWFhYAAAAHAAAA2NvbXBhdGlibGVfYnJhbmRzAGlzb21tcDQyAP/7UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAInfoAAAAaAAAAAQAAAwAAwAAAAAADAAAAAAAAAAAAAAAAAD//7UAAALAAAABAAAAAAABAAAAAA==');
                    silentAudio.loop = true; // Loop to keep session active
                    silentAudio.volume = 0.01; // Non-zero volume sometimes helps
                    silentAudioRef.current = silentAudio;
                }
                silentAudioRef.current.play().then(() => {
                     console.log('Silent HTML5 audio playing (Silent Switch Bypass Active)');
                }).catch(e => {
                    if (e.name !== 'NotSupportedError') {
                        console.debug('Silent HTML5 audio skipped:', e);
                    }
                });
            } catch (e) {
                // Ignore
            }

            // 3. Create Audio Nodes
            try {
                const bufferSize = ctx.sampleRate * 2;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }

                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                noise.loop = true;
                noiseNodeRef.current = noise;

                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 600;
                filter.Q.value = 1;
                filterNodeRef.current = filter;

                const gain = ctx.createGain();
                gain.gain.value = 0;
                gainNodeRef.current = gain;

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                noise.start();
                isInitializedRef.current = true;
                setIsReady(true);
                console.log('Audio System Initialized & Ready');
            } catch (e) {
                console.error('Failed to init audio nodes:', e);
            }

            // Remove listeners
            ['click', 'keydown', 'touchstart', 'touchend'].forEach(event => 
                window.removeEventListener(event, initAudio, { capture: true })
            );
        };

        // Add listeners
        ['click', 'keydown', 'touchstart', 'touchend'].forEach(event => 
            window.addEventListener(event, initAudio, { capture: true })
        );

        return () => {
             ['click', 'keydown', 'touchstart', 'touchend'].forEach(event => 
                window.removeEventListener(event, initAudio, { capture: true })
            );
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
            if (silentAudioRef.current) {
                silentAudioRef.current.pause();
                silentAudioRef.current = null;
            }
        };
    }, []);

    const resumeAudio = () => {
        if (audioContextRef.current) {
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }
            // Also try to play silent audio again
            if (silentAudioRef.current && silentAudioRef.current.paused) {
                silentAudioRef.current.play().catch(() => {});
            }
            // Play a test beep to confirm
            playBeep(1);
        }
    };

    // Beep sound generator
    const playBeep = (count: number = 1) => {
        if (!audioContextRef.current || !isReady) return;
        
        console.log(`Playing beep: ${count} times`);
        const ctx = audioContextRef.current;
        const now = ctx.currentTime;
        
        for (let i = 0; i < count; i++) {
            const osc = ctx.createOscillator();
            const beepGain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = 800; // 800Hz beep
            
            const startTime = now + (i * 0.2); // 200ms between beeps
            const endTime = startTime + 0.1; // 100ms beep duration
            
            beepGain.gain.setValueAtTime(0, startTime);
            beepGain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
            beepGain.gain.linearRampToValueAtTime(0, endTime);
            
            osc.connect(beepGain);
            beepGain.connect(ctx.destination);
            
            osc.start(startTime);
            osc.stop(endTime);
        }
    };

    // Landing sound - Pneumatic hiss + Mechanical thud
    const playLandingSound = () => {
        if (!audioContextRef.current || !isReady) return;
        console.log('Playing landing sound');
        
        const ctx = audioContextRef.current;
        const now = ctx.currentTime;
        
        // 1. Mechanical "Thud" (Low frequency impact)
        const osc = ctx.createOscillator();
        const thudGain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15); // Quick pitch drop
        
        thudGain.gain.setValueAtTime(0, now);
        thudGain.gain.linearRampToValueAtTime(0.6, now + 0.02); // Fast attack
        thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); // Fast decay
        
        osc.connect(thudGain);
        thudGain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.25);

        // 2. Pneumatic "Hiss" (Filtered Noise for landing gear/venting)
        const bufferSize = ctx.sampleRate * 0.8; // 0.8 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.frequency.linearRampToValueAtTime(400, now + 0.6); // Filter sweep down
        noiseFilter.Q.value = 0.7;
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.8);
    };

    // Crash sound - harsh noise burst
    const playCrashSound = () => {
        if (!audioContextRef.current || !isReady) return;
        console.log('Playing crash sound');
        
        const ctx = audioContextRef.current;
        const now = ctx.currentTime;
        
        // Create noise buffer for crash
        const bufferSize = ctx.sampleRate * 0.5; // 0.5 second crash
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3)); // Decaying noise
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        const crashFilter = ctx.createBiquadFilter();
        crashFilter.type = 'lowpass';
        crashFilter.frequency.value = 1200;
        crashFilter.Q.value = 0.5;
        
        const crashGain = ctx.createGain();
        crashGain.gain.setValueAtTime(0.5, now);
        crashGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        noise.connect(crashFilter);
        crashFilter.connect(crashGain);
        crashGain.connect(ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.5);
    };

    // Update sound based on thrust and detect events
    useEffect(() => {
        if (!gainNodeRef.current || !audioContextRef.current || !isReady) return;

        // Check if ANY rocket is thrusting
        const rockets = bodies.filter(b => b.isRocket);
        const isThrusting = rockets.some(rocket => 
            rocket.thrust && (Math.abs(rocket.thrust.x) > 0.0001 || Math.abs(rocket.thrust.y) > 0.0001)
        );

        const targetGain = isThrusting ? 0.5 : 0; 
        const currentTime = audioContextRef.current.currentTime;
        
        // Only log if gain changes significantly
        if (Math.abs(gainNodeRef.current.gain.value - targetGain) > 0.1) {
             console.log(`Audio Update: Thrusting=${isThrusting}, TargetGain=${targetGain}`);
        }

        // Smooth transition
        gainNodeRef.current.gain.setTargetAtTime(targetGain, currentTime, 0.1);

        // Track current rocket IDs
        const currentRocketIds = new Set(rockets.map(r => r.id));
        
        // 1. Detect rocket crashes (rocket that existed before but is now gone)
        prevRocketIdsRef.current.forEach(prevId => {
            if (!currentRocketIds.has(prevId)) {
                // Rocket was destroyed!
                playCrashSound();
            }
        });
        
        // Update previous rocket IDs
        prevRocketIdsRef.current = currentRocketIds;
        
        // Check each rocket for events
        rockets.forEach(rocket => {
            const rocketId = rocket.id;
            
            // 2. Detect landings (transitioned from flying to landed)
            const wasLanded = prevLandedStatusRef.current.get(rocketId);
            const isLanded = !!rocket.landedOnBodyId;
            
            if (!wasLanded && isLanded) {
                // Just landed!
                playLandingSound();
            }
            prevLandedStatusRef.current.set(rocketId, isLanded);
            
            // 3. Check for new maneuvers starting
            const activeManeuver = rocket.maneuvers?.find(m => m.status === 'active');
            const prevManeuverType = prevManeuversRef.current.get(rocketId);
            const currentManeuverType = activeManeuver?.type;
            
            if (currentManeuverType && currentManeuverType !== prevManeuverType) {
                // New maneuver started!
                if (currentManeuverType === 'auto_circularize') {
                    playBeep(1);
                } else if (currentManeuverType === 'auto_land') {
                    playBeep(2);
                } else if (currentManeuverType === 'auto_transfer') {
                    playBeep(3);
                }
            }
            prevManeuversRef.current.set(rocketId, currentManeuverType || '');
            
            // 4. Check for SAS mode changes
            const prevSASMode = prevSASModeRef.current.get(rocketId);
            const currentSASMode = rocket.sasMode || 'off';
            
            if (currentSASMode !== prevSASMode && prevSASMode !== undefined) {
                // SAS mode changed!
                playBeep(1);
            }
            prevSASModeRef.current.set(rocketId, currentSASMode);
            
            // 5. Check for low altitude warning (altitude < 10 and descending)
            if (!rocket.landedOnBodyId) {
                // Find parent body
                const parent = bodies.find(b => b.id === rocket.orbitReferenceId);
                if (parent) {
                    const dx = rocket.position.x - parent.position.x;
                    const dy = rocket.position.y - parent.position.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const altitude = distance - parent.radius;
                    
                    // Calculate radial velocity (component toward/away from parent)
                    const relVx = rocket.velocity.x - parent.velocity.x;
                    const relVy = rocket.velocity.y - parent.velocity.y;
                    const radialVelocity = (dx * relVx + dy * relVy) / distance;
                    const isDescending = radialVelocity < 0;
                    
                    const shouldBeep = altitude < 10 && isDescending;
                    const wasBeeping = lowAltitudeBeepingRef.current.get(rocketId);
                    
                    if (shouldBeep && !wasBeeping) {
                        // Start beeping
                        playBeep(1);
                        lowAltitudeBeepingRef.current.set(rocketId, true);
                    } else if (shouldBeep && wasBeeping) {
                        // Continue beeping from 1s for 10km to 0.1s for 2km based on altitude
                        const now = audioContextRef.current!.currentTime;
                        const timeSinceLastBeep = now - lastBeepTimeRef.current;
                        const beepDuration = Math.max(0.1, Math.min(1, altitude / 2000));
                        
                        if (timeSinceLastBeep > beepDuration) {
                            playBeep(1);
                            lastBeepTimeRef.current = now;
                        }
                    } else if (!shouldBeep && wasBeeping) {
                        // Stop beeping
                        lowAltitudeBeepingRef.current.set(rocketId, false);
                    }
                }
            } else {
                // Landed, clear beeping flag
                lowAltitudeBeepingRef.current.set(rocketId, false);
            }
        });
        
    }, [bodies, isReady]);
    
    return { audioState, resumeAudio };
};
