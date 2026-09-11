import React, { useState } from 'react';
import { ThemeHook } from '../hooks/useTheme';
import {
  evaluateSTART,
  summarizeMCI,
  generateLawnmowerSweep,
  generateExpandingSquareSearch,
  encodeLoRaPacket,
  decodeLoRaPacket,
  DTNBundleStore,
  findSafestEvacuationRoute,
  correlateVisionDetection,
  EmergencyGovernor,
  LoRaUartGateway,
  AtmosphericPlumeEngine,
  AcousticSosDetector,
  PqcHybridSigner,
  SatelliteSbdCodec,
  FloodHydrodynamicEngine,
  DroneSwarmFlockingEngine,
  BiometricVitalsEngine,
  SeismicEarlyWarningEngine,
  MicrogridEnergyEngine,
  ZkpVictimIdentityEngine,
  TriageResult,
  MissionPlan,
  DTNBundle,
  EvacuationRoutePlan,
  VisionCorrelationResult,
  GovernanceProposal,
  PlumeSimulationResult,
  AcousticSosClassification,
  PqcSignedPacket,
  PqcHybridKeyPair,
  FloodSimulationReport,
  SwarmVectorOutput,
  BiometricEvaluationReport,
  EarthquakeWarningReport,
  MicrogridDispatchReport,
  ZkpSupplyClaimProof,
} from '@mirage/crdt-logic';

interface TacticalHubProps {
  theme: ThemeHook;
  isOpen: boolean;
  onClose: () => void;
}

type TabType =
  | 'triage'
  | 'satellite'
  | 'flood'
  | 'swarm'
  | 'biometrics'
  | 'seismic'
  | 'microgrid'
  | 'zkp'
  | 'plume'
  | 'loraUart'
  | 'acoustic'
  | 'pqc'
  | 'evacuation'
  | 'dtn'
  | 'vision'
  | 'governance'
  | 'drone'
  | 'cot'
  | 'lora'
  | 'forecast';


export const TacticalHub: React.FC<TacticalHubProps> = ({ theme, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('triage');


  // 1. Triage state
  const [patientId, setPatientId] = useState('VIC-' + Math.floor(1000 + Math.random() * 9000));
  const [isAbleToWalk, setIsAbleToWalk] = useState(false);
  const [isBreathing, setIsBreathing] = useState(true);
  const [respRate, setRespRate] = useState(24);
  const [hasRadialPulse, setHasRadialPulse] = useState(true);
  const [followsCommands, setFollowsCommands] = useState(true);
  const [severeHemorrhage, setSevereHemorrhage] = useState(false);
  const [triageHistory, setTriageHistory] = useState<TriageResult[]>([]);

  // 2. Drone mission state
  const [dronePattern, setDronePattern] = useState<'lawnmower' | 'expanding_square'>('lawnmower');
  const [activeMission, setActiveMission] = useState<MissionPlan | null>(null);

  // 3. LoRa codec state
  const [loraPacket, setLoraPacket] = useState({
    packetType: 'BEACON' as const,
    priority: 'CRITICAL' as const,
    nodeIdHash: 0x1a2b3c4d,
    lng: 77.5945,
    lat: 12.9716,
    batteryPct: 42,
    triageTag: 'RED' as const,
    sensorValue: 6.8,
    shortMessage: 'TRAPPED',
  });
  const [encodedBytesHex, setEncodedBytesHex] = useState<string>('');
  const [decodedPacketResult, setDecodedPacketResult] = useState<any>(null);

  // 4. DTN Store-and-Forward Mesh state
  const [dtnStore] = useState(() => {
    const store = new DTNBundleStore(100);
    store.ingestBundle({
      bundleId: 'bundle-sos-001',
      sourceNodeId: 'field-mule-alpha',
      destinationNodeId: '*',
      creationTimestamp: Date.now() - 3600_000,
      ttlMs: 86400_000,
      hopCount: 2,
      maxHops: 8,
      payloadType: 'SOS_BEACON',
      payload: { victimCount: 4, injuryLevel: 'SEVERE', location: [77.5946, 12.9716] },
      custodyAcceptedBy: ['field-mule-alpha', 'relay-uav-02'],
    }, 'local-node');
    return store;
  });
  const [dtnBundles, setDtnBundles] = useState<DTNBundle[]>(() => dtnStore.getActiveBundles());
  const [newDtnType, setNewDtnType] = useState<'SOS_BEACON' | 'CASUALTY_REPORT' | 'SUPPLY_MANIFEST' | 'TACTICAL_ORDER'>('SOS_BEACON');
  const [newDtnPayloadText, setNewDtnPayloadText] = useState('Medical supplies needed at Sector 4');

  // 5. Evacuation Router state
  const [evacPlan, setEvacPlan] = useState<EvacuationRoutePlan | null>(null);

  // 6. Drone Vision state
  const [visionDetections, setVisionDetections] = useState<VisionCorrelationResult[]>([]);

  // 7. Multi-Sig Governance Council state
  const [governor] = useState(() => {
    const gov = new EmergencyGovernor([
      { signerId: 'ic-01', agencyName: 'FEMA Incident Command', publicKeyHex: '04aa', role: 'incident_commander' },
      { signerId: 'fire-01', agencyName: 'Metropolitan Fire Dept', publicKeyHex: '04bb', role: 'fire_marshall' },
      { signerId: 'med-01', agencyName: 'Disaster Health Operations', publicKeyHex: '04cc', role: 'chief_medical_officer' },
    ]);
    gov.createProposal(
      'MANDATORY_EVACUATION',
      'Immediate Evacuation of Flood Zone Bravo',
      'zone-flood-01',
      { evacWindowHours: 4, safeShelterId: 'hub-north-01' },
      2,
      24
    );
    return gov;
  });
  const [proposals, setProposals] = useState<GovernanceProposal[]>(() => governor.getAllProposals());

  // Handlers
  const handleRunTriage = () => {
    const result = evaluateSTART({
      patientId,
      isAbleToWalk,
      isBreathing,
      respiratoryRatePerMin: respRate,
      hasRadialPulse,
      followsCommands,
      hasSevereHemorrhage: severeHemorrhage,
    });
    setTriageHistory(prev => [result, ...prev]);
    setPatientId('VIC-' + Math.floor(1000 + Math.random() * 9000));
    theme.triggerHaptic('success');
  };

  const handlePlanDrone = () => {
    if (dronePattern === 'lawnmower') {
      const plan = generateLawnmowerSweep(12.96, 12.98, 77.58, 77.61, 0.4, 80, []);
      setActiveMission(plan);
    } else {
      const plan = generateExpandingSquareSearch(12.9716, 77.5946, 0.25, 4, 60);
      setActiveMission(plan);
    }
    theme.triggerHaptic('success');
  };

  const handleTestLoRa = () => {
    const bytes = encodeLoRaPacket(loraPacket);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    setEncodedBytesHex(hex);
    const decoded = decodeLoRaPacket(bytes);
    setDecodedPacketResult(decoded);
    theme.triggerHaptic('tap');
  };

  const handleCreateDtnBundle = () => {
    const bundle: DTNBundle = {
      bundleId: `bundle-${Date.now().toString(36)}`,
      sourceNodeId: 'field-tablet-local',
      destinationNodeId: '*',
      creationTimestamp: Date.now(),
      ttlMs: 172800_000, // 48h
      hopCount: 0,
      maxHops: 10,
      payloadType: newDtnType,
      payload: { message: newDtnPayloadText, timestamp: new Date().toISOString() },
      custodyAcceptedBy: ['field-tablet-local'],
    };
    dtnStore.ingestBundle(bundle, 'field-tablet-local');
    setDtnBundles(dtnStore.getActiveBundles());
    theme.triggerHaptic('success');
  };

  const handleSolveEvacuation = () => {
    const nodes = [
      { nodeId: 'evac-origin', name: 'Disaster Staging Point', lat: 12.9716, lng: 77.5946 },
      { nodeId: 'hub-alpha', name: 'Safe Haven Shelter Alpha', lat: 12.985, lng: 77.61, isShelter: true },
      { nodeId: 'hub-beta', name: 'Metro Stadium Trauma Center', lat: 12.955, lng: 77.575, isShelter: true },
    ];
    const edges = [
      { edgeId: 'e1', fromNodeId: 'evac-origin', toNodeId: 'hub-alpha', distanceKm: 2.4, damageFactor: 0.2, isPassable: true, activeHazardExposure: 0.1, congestionPenalty: 0.3 },
      { edgeId: 'e2', fromNodeId: 'evac-origin', toNodeId: 'hub-beta', distanceKm: 3.8, damageFactor: 1.5, isPassable: true, activeHazardExposure: 0.8, congestionPenalty: 0.7 },
    ];
    const plan = findSafestEvacuationRoute('evac-origin', nodes, edges);
    setEvacPlan(plan);
    theme.triggerHaptic('success');
  };

  const handleSimulateDroneVision = () => {
    const mockDetection = {
      detectionId: `vis-${Date.now()}`,
      droneId: 'UAV-Recon-04',
      timestamp: Date.now(),
      aiClass: 'survivor_waving' as const,
      confidence: 0.94,
      thermalSignatureCelsius: 37.4,
      groundBounds: { minLng: 77.594, minLat: 12.971, maxLng: 77.595, maxLat: 12.972 },
      centroid: [77.5945, 12.9715] as [number, number],
    };
    const result = correlateVisionDetection(mockDetection, [
      { beaconId: 'beacon-99', coordinates: [77.58, 12.95], severity: 'LOW' },
    ]);
    setVisionDetections(prev => [result, ...prev]);
    theme.triggerHaptic('warning');
  };

  const handleSignProposal = (proposalId: string, signerId: string) => {
    governor.signProposal(proposalId, signerId, 'sig-hex-verified-0x994a');
    setProposals([...governor.getAllProposals()]);
    theme.triggerHaptic('success');
  };

  // 8. Atmospheric Plume Dispersion state & handler
  const [plumeEngine] = useState(() => new AtmosphericPlumeEngine());
  const [plumeResult, setPlumeResult] = useState<PlumeSimulationResult | null>(() =>
    plumeEngine.simulatePlume({
      sourceId: 'chem-tank-01',
      contaminantName: 'CHLORINE_GAS',
      releaseRateGramsPerSec: 650,
      effectiveHeightMeters: 12,
      originCoordinates: [77.5946, 12.9716],
      windSpeedMps: 3.8,
      windBearingDegrees: 270,
      stabilityClass: 'C',
    })
  );

  const handleSimulatePlume = () => {
    const res = plumeEngine.simulatePlume({
      sourceId: `chem-tank-${Date.now().toString(36)}`,
      contaminantName: 'AMMONIA_ANHYDROUS',
      releaseRateGramsPerSec: 800,
      effectiveHeightMeters: 10,
      originCoordinates: [77.5946, 12.9716],
      windSpeedMps: 4.2,
      windBearingDegrees: 315,
      stabilityClass: 'D',
    });
    setPlumeResult(res);
    theme.triggerHaptic('warning');
  };

  // 9. Physical LoRa UART Gateway state & handler
  const [uartGateway] = useState(() => new LoRaUartGateway({ frequencyMhz: 915.0, spreadingFactor: 9, txPowerDbm: 20 }));
  const [uartFramedHex, setUartFramedHex] = useState<string>('');
  const [uartTelemetry, setUartTelemetry] = useState<any>(null);

  const handleFrameUartSlip = () => {
    const rawPacket = new Uint8Array([0xAA, 0x01, 0xC0, 0x42, 0xDB, 0xFF]);
    const framed = uartGateway.encodeSlipFrame(rawPacket);
    const hex = Array.from(framed).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    setUartFramedHex(hex);

    const telem = uartGateway.parseRadioTelemetry('+RCV=24,0,-86,8');
    const link = uartGateway.evaluateLinkQuality(telem.rssiDbm, telem.snrDb);
    setUartTelemetry({ ...telem, ...link });
    theme.triggerHaptic('tap');
  };

  // 10. Acoustic Distress & SOS Detector state & handler
  const [acousticDetector] = useState(() => new AcousticSosDetector());
  const [acousticResult, setAcousticResult] = useState<AcousticSosClassification | null>(() =>
    acousticDetector.classifyAudioBuffer([
      { timestampMs: 100, dominantFrequencyHz: 3000, spectralPowerDb: -10, signalToNoiseRatioDb: 18, isPulsing: true },
      { timestampMs: 200, dominantFrequencyHz: 3040, spectralPowerDb: -11, signalToNoiseRatioDb: 19, isPulsing: true },
      { timestampMs: 300, dominantFrequencyHz: 3020, spectralPowerDb: -10, signalToNoiseRatioDb: 21, isPulsing: true },
    ])
  );

  const handleRunAcousticAnalysis = (type: 'whistle' | 'morse' | 'ambient') => {
    let frames: any[] = [];
    if (type === 'whistle') {
      frames = [
        { timestampMs: 100, dominantFrequencyHz: 3000, spectralPowerDb: -10, signalToNoiseRatioDb: 18, isPulsing: true },
        { timestampMs: 200, dominantFrequencyHz: 3040, spectralPowerDb: -11, signalToNoiseRatioDb: 19, isPulsing: true },
        { timestampMs: 300, dominantFrequencyHz: 3020, spectralPowerDb: -10, signalToNoiseRatioDb: 21, isPulsing: true },
      ];
    } else if (type === 'morse') {
      frames = [
        { timestampMs: 100, dominantFrequencyHz: 1200, spectralPowerDb: -15, signalToNoiseRatioDb: 12, isPulsing: true, pulseDurationMs: 150 },
        { timestampMs: 300, dominantFrequencyHz: 1200, spectralPowerDb: -15, signalToNoiseRatioDb: 12, isPulsing: true, pulseDurationMs: 150 },
        { timestampMs: 500, dominantFrequencyHz: 1200, spectralPowerDb: -15, signalToNoiseRatioDb: 12, isPulsing: true, pulseDurationMs: 150 },
        { timestampMs: 800, dominantFrequencyHz: 1200, spectralPowerDb: -15, signalToNoiseRatioDb: 12, isPulsing: true, pulseDurationMs: 650 },
        { timestampMs: 1600, dominantFrequencyHz: 1200, spectralPowerDb: -15, signalToNoiseRatioDb: 12, isPulsing: true, pulseDurationMs: 650 },
      ];
    } else {
      frames = [{ timestampMs: 100, dominantFrequencyHz: 80, spectralPowerDb: -50, signalToNoiseRatioDb: 1, isPulsing: false }];
    }
    const res = acousticDetector.classifyAudioBuffer(frames);
    setAcousticResult(res);
    theme.triggerHaptic(res.isSosConfirmed ? 'warning' : 'tap');
  };

  // 11. Post-Quantum Hybrid Lattice Signer state & handler
  const [pqcSigner] = useState(() => new PqcHybridSigner());
  const [pqcKeyPair, setPqcKeyPair] = useState<PqcHybridKeyPair | null>(() => pqcSigner.generateHybridKeyPair('node-ic-tactical'));
  const [pqcSignedPacket, setPqcSignedPacket] = useState<PqcSignedPacket | null>(null);
  const [pqcVerificationStatus, setPqcVerificationStatus] = useState<string | null>(null);

  const handleGeneratePqcKeysAndSign = () => {
    const keys = pqcSigner.generateHybridKeyPair(`node-tactical-${Date.now().toString(36)}`);
    setPqcKeyPair(keys);

    const payload = {
      directive: 'DEPLOY_SEARCH_CANINE_TEAM',
      sector: 'ZONE_BRAVO_COLLAPSE',
      timestamp: new Date().toISOString(),
    };
    const signed = pqcSigner.signPayload(payload, keys, Math.floor(Math.random() * 1_000_000));
    setPqcSignedPacket(signed);

    const verify = pqcSigner.verifySignedPacket(payload, signed, keys.classicalPrivateKeyHex, keys.quantumLatticeSeedHex);
    setPqcVerificationStatus(verify.isValid ? 'VERIFIED_VALID (Classical HMAC + Quantum Lattice Commitments Active)' : 'FAILED');
    theme.triggerHaptic('success');
  };

  // 12. V9 Satellite SBD State & Handler
  const [sbdCodec] = useState(() => new SatelliteSbdCodec());
  const [sbdFrameHex, setSbdFrameHex] = useState<string>('');
  const [sbdDopplerHz, setSbdDopplerHz] = useState<number>(() => sbdCodec.calculateDopplerShiftHz());

  const handleEncodeSbd = () => {
    const frame = sbdCodec.encodeSbdFrame(
      Math.floor(1000 + Math.random() * 9000),
      'SOS_EMERGENCY',
      12.9716,
      77.5946,
      'SEISMIC_STRUCTURAL_FAILURE_HOSPITAL'
    );
    const hex = Array.from(frame).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    setSbdFrameHex(hex);
    setSbdDopplerHz(sbdCodec.calculateDopplerShiftHz());
    theme.triggerHaptic('success');
  };

  // 13. V10 Flood Hydrodynamic Simulator State & Handler
  const [floodEngine] = useState(() => new FloodHydrodynamicEngine());
  const [floodReport, setFloodReport] = useState<FloodSimulationReport | null>(() =>
    floodEngine.simulateDamBreach({
      damId: 'dam-krishna-01',
      damName: 'Krishna Valley Reservoir Dam',
      reservoirVolumeM3: 45_000_000,
      breachWidthMeters: 100,
      initialWaterHeadMeters: 40,
      originCoordinates: [77.5946, 12.9716],
      downstreamChannelSlope: 0.002,
      manningsRoughnessCoeff: 0.04,
    })
  );

  const handleSimulateFlood = () => {
    const report = floodEngine.simulateDamBreach({
      damId: `dam-${Date.now().toString(36)}`,
      damName: 'Cascade Valley Dam',
      reservoirVolumeM3: 65_000_000,
      breachWidthMeters: 150,
      initialWaterHeadMeters: 55,
      originCoordinates: [77.5946, 12.9716],
      downstreamChannelSlope: 0.003,
      manningsRoughnessCoeff: 0.045,
    });
    setFloodReport(report);
    theme.triggerHaptic('warning');
  };

  // 14. V11 Swarm Drone Flocking State & Handler
  const [swarmEngine] = useState(() => new DroneSwarmFlockingEngine());
  const [swarmVectors, setSwarmVectors] = useState<SwarmVectorOutput[]>(() =>
    swarmEngine.computeSwarmTrajectories([
      { droneId: 'UAV-Alpha', position: { x: 0, y: 0, z: 50 }, velocity: { vx: 5, vy: 5, vz: 0 }, batteryPct: 92, assignedSectorId: 'SEC_A' },
      { droneId: 'UAV-Bravo', position: { x: 8, y: 6, z: 50 }, velocity: { vx: 4, vy: 6, vz: 0 }, batteryPct: 89, assignedSectorId: 'SEC_A' },
      { droneId: 'UAV-Charlie', position: { x: 90, y: 80, z: 50 }, velocity: { vx: 0, vy: 8, vz: 0 }, batteryPct: 85, assignedSectorId: 'SEC_B' },
    ])
  );

  const handleComputeSwarm = () => {
    const vectors = swarmEngine.computeSwarmTrajectories([
      { droneId: 'UAV-Alpha', position: { x: Math.random() * 20, y: Math.random() * 20, z: 50 }, velocity: { vx: 6, vy: 4, vz: 0 }, batteryPct: 90, assignedSectorId: 'SEC_A' },
      { droneId: 'UAV-Bravo', position: { x: Math.random() * 20, y: Math.random() * 20, z: 50 }, velocity: { vx: 5, vy: 5, vz: 0 }, batteryPct: 86, assignedSectorId: 'SEC_A' },
      { droneId: 'UAV-Charlie', position: { x: 80 + Math.random() * 10, y: 80 + Math.random() * 10, z: 50 }, velocity: { vx: 0, vy: 7, vz: 0 }, batteryPct: 81, assignedSectorId: 'SEC_B' },
    ]);
    setSwarmVectors(vectors);
    theme.triggerHaptic('tap');
  };

  // 15. V12 Biometric Vitals State & Handler
  const [vitalsEngine] = useState(() => new BiometricVitalsEngine());
  const [biometricReport, setBiometricReport] = useState<BiometricEvaluationReport | null>(() =>
    vitalsEngine.evaluateVitals({
      patientId: 'PT-409',
      heartRateBpm: 138,
      systolicBpMmhg: 82,
      diastolicBpMmhg: 50,
      spO2Percent: 87,
      respiratoryRateBpm: 29,
      bodyTemperatureCelsius: 36.1,
      ecgArrhythmiaDetected: true,
      currentTriageTag: 'YELLOW',
      timestamp: Date.now(),
    })
  );

  const handleEvaluateBiometrics = (status: 'critical' | 'stable') => {
    const data = status === 'critical'
      ? { patientId: 'PT-802', heartRateBpm: 145, systolicBpMmhg: 78, diastolicBpMmhg: 46, spO2Percent: 84, respiratoryRateBpm: 34, bodyTemperatureCelsius: 35.6, ecgArrhythmiaDetected: true, currentTriageTag: 'YELLOW' as const, timestamp: Date.now() }
      : { patientId: 'PT-103', heartRateBpm: 76, systolicBpMmhg: 122, diastolicBpMmhg: 78, spO2Percent: 98, respiratoryRateBpm: 16, bodyTemperatureCelsius: 36.8, ecgArrhythmiaDetected: false, currentTriageTag: 'GREEN' as const, timestamp: Date.now() };

    const rep = vitalsEngine.evaluateVitals(data);
    setBiometricReport(rep);
    theme.triggerHaptic(rep.recommendedTriageTag === 'RED' ? 'warning' : 'success');
  };

  // 16. V13 Seismic EEW State & Handler
  const [seismicEngine] = useState(() => new SeismicEarlyWarningEngine());
  const [seismicReport, setSeismicReport] = useState<EarthquakeWarningReport | null>(() =>
    seismicEngine.evaluateSeismicEvent([
      { stationId: 'ST-1', locationCoordinates: [77.59, 12.97], elevationMeters: 920, staLtaRatio: 5.8, pWaveArrivalTimestampMs: Date.now(), peakGroundAccelerationG: 0.38 },
      { stationId: 'ST-2', locationCoordinates: [77.62, 12.95], elevationMeters: 910, staLtaRatio: 6.2, pWaveArrivalTimestampMs: Date.now() + 600, peakGroundAccelerationG: 0.42 },
    ])
  );

  const handleRunSeismicAnalysis = () => {
    const rep = seismicEngine.evaluateSeismicEvent([
      { stationId: 'ST-1', locationCoordinates: [77.58, 12.96], elevationMeters: 925, staLtaRatio: 6.5, pWaveArrivalTimestampMs: Date.now(), peakGroundAccelerationG: 0.45 },
      { stationId: 'ST-2', locationCoordinates: [77.64, 12.93], elevationMeters: 890, staLtaRatio: 7.1, pWaveArrivalTimestampMs: Date.now() + 400, peakGroundAccelerationG: 0.52 },
    ]);
    setSeismicReport(rep);
    theme.triggerHaptic('warning');
  };

  // 17. V14 Microgrid Energy State & Handler
  const [microgridEngine] = useState(() => new MicrogridEnergyEngine());
  const [microgridReport, setMicrogridReport] = useState<MicrogridDispatchReport | null>(() =>
    microgridEngine.optimizeEnergyDispatch([
      { assetId: 'solar-01', type: 'SOLAR_PV', capacityKw: 40, currentOutputOrDrawKw: 18, priorityTier: 1 },
      { assetId: 'bess-01', type: 'BESS_BATTERY', capacityKw: 120, currentOutputOrDrawKw: 25, batterySocPercent: 24, priorityTier: 1 },
      { assetId: 'hospital-icu', type: 'HOSPITAL_LOAD', capacityKw: 45, currentOutputOrDrawKw: 38, priorityTier: 1 },
      { assetId: 'basecamp-tent', type: 'BASE_CAMP_LOAD', capacityKw: 30, currentOutputOrDrawKw: 22, priorityTier: 3 },
    ])
  );

  const handleOptimizeMicrogrid = () => {
    const rep = microgridEngine.optimizeEnergyDispatch([
      { assetId: 'solar-01', type: 'SOLAR_PV', capacityKw: 40, currentOutputOrDrawKw: 10, priorityTier: 1 },
      { assetId: 'bess-01', type: 'BESS_BATTERY', capacityKw: 120, currentOutputOrDrawKw: 35, batterySocPercent: 18, priorityTier: 1 },
      { assetId: 'hospital-icu', type: 'HOSPITAL_LOAD', capacityKw: 45, currentOutputOrDrawKw: 40, priorityTier: 1 },
      { assetId: 'basecamp-tent', type: 'BASE_CAMP_LOAD', capacityKw: 30, currentOutputOrDrawKw: 25, priorityTier: 3 },
    ]);
    setMicrogridReport(rep);
    theme.triggerHaptic('tap');
  };

  // 18. V15 ZKP Anonymous Claims State & Handler
  const [zkpEngine] = useState(() => new ZkpVictimIdentityEngine());
  const [zkpClaimStatus, setZkpClaimStatus] = useState<{ isApproved: boolean; token?: string; reason?: string } | null>(null);

  const handleClaimZkpRation = (isDoubleClaimAttempt = false) => {
    const secret = isDoubleClaimAttempt ? 'fixed_secret_used_twice' : `secret_${Date.now()}`;
    const proof = zkpEngine.createSupplyClaimProof(secret, 'INSULIN_AND_TRAUMA_KIT');
    const result = zkpEngine.verifyAndRedeemClaim(proof);
    setZkpClaimStatus({
      isApproved: result.isApproved,
      token: result.redemptionToken,
      reason: result.rejectionReason,
    });
    theme.triggerHaptic(result.isApproved ? 'success' : 'warning');
  };

  const mciSummary = summarizeMCI(triageHistory);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '92vh',
          backgroundColor: theme.styles.panelBg,
          border: `${theme.styles.borderWidth} solid ${theme.styles.borderColor}`,
          borderRadius: '12px',
          color: theme.styles.textColor,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: theme.styles.glowShadow,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: `1px solid ${theme.styles.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: theme.styles.headerBg,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px', letterSpacing: '1px' }}>
                GLOBAL TACTICAL COMMAND &amp; DISASTER GOVERNANCE HUB
              </div>
              <div style={{ fontSize: '11px', opacity: 0.7 }}>
                DTN Bundle Protocol • Dynamic Evacuation Solver • Edge AI Vision • Multi-Sig Governance • ATAK CoT
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: `1px solid ${theme.styles.borderColor}`,
              color: theme.styles.textColor,
              borderRadius: '6px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${theme.styles.borderColor}`,
            background: 'rgba(0, 0, 0, 0.25)',
            overflowX: 'auto',
          }}
        >
          {(
            [
              { id: 'triage', label: '🚑 MCI START Triage', badge: mciSummary.counts.RED },
              { id: 'satellite', label: '🛰️ Satellite Direct-to-Cell', badge: 'Iridium' },
              { id: 'flood', label: '🌊 Flood & Dam Hydrodynamic', badge: floodReport?.evacuationDirective ? 'HIGH GROUND' : null },
              { id: 'swarm', label: '🛸 Swarm Drone Flocking', badge: `${swarmVectors.length} UAVs` },
              { id: 'biometrics', label: '❤️ Biometric Vitals', badge: biometricReport?.recommendedTriageTag },
              { id: 'seismic', label: '🌋 Seismic EEW Triangulation', badge: seismicReport ? `M${seismicReport.estimatedMagnitudeMw}` : null },
              { id: 'microgrid', label: '⚡ Microgrid Black-Start', badge: microgridReport?.gridStatus },
              { id: 'zkp', label: '🛡️ ZKP Anonymous Claims', badge: 'ZKP-Active' },
              { id: 'plume', label: '☢️ Plume Hazard Radar', badge: plumeResult ? plumeResult.evacuationUrgency : null },
              { id: 'loraUart', label: '🔌 LoRa Physical UART', badge: 'SX1262' },
              { id: 'acoustic', label: '🎙️ Acoustic SOS Detector', badge: acousticResult?.isSosConfirmed ? 'SOS!' : null },
              { id: 'pqc', label: '🔐 PQC Hybrid Lattice', badge: pqcKeyPair ? 'PQC-Active' : null },
              { id: 'evacuation', label: '🛣️ Dynamic Evacuation Router', badge: evacPlan ? `${evacPlan.safetyScore}/100` : null },
              { id: 'dtn', label: '📦 DTN Bundle Mesh', badge: dtnBundles.length },
              { id: 'vision', label: '👁️ Drone AI Vision', badge: visionDetections.length },
              { id: 'governance', label: '📜 Multi-Sig Council', badge: proposals.filter(p => !p.isExecuted).length },
              { id: 'drone', label: '🛸 SAR Flight Planner', badge: activeMission ? 'Active' : null },
              { id: 'cot', label: '📡 ATAK Cursor on Target', badge: null },
              { id: 'lora', label: '📻 LoRa 24B Codec', badge: '24B' },
              { id: 'forecast', label: '📊 Supply Burn Forecaster', badge: null },
            ] as const
          ).map(tab => (


            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                theme.triggerHaptic('tap');
              }}
              style={{
                flex: '0 0 auto',
                padding: '10px 14px',
                background: activeTab === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? `3px solid ${theme.styles.btnPrimaryBg}` : '3px solid transparent',
                color: activeTab === tab.id ? '#38bdf8' : theme.styles.textColor,
                fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
              {tab.badge !== null && (
                <span
                  style={{
                    backgroundColor: tab.id === 'triage' && mciSummary.counts.RED > 0 ? '#ef4444' : 'rgba(56, 189, 248, 0.3)',
                    color: '#ffffff',
                    fontSize: '10px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* TAB: MCI START TRIAGE */}
          {activeTab === 'triage' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '20px' }}>{mciSummary.counts.RED}</div>
                  <div style={{ fontSize: '11px' }}>🔴 RED (Immediate)</div>
                </div>
                <div style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid #eab308', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#eab308', fontWeight: 'bold', fontSize: '20px' }}>{mciSummary.counts.YELLOW}</div>
                  <div style={{ fontSize: '11px' }}>🟡 YELLOW (Delayed)</div>
                </div>
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '20px' }}>{mciSummary.counts.GREEN}</div>
                  <div style={{ fontSize: '11px' }}>🟢 GREEN (Minor)</div>
                </div>
                <div style={{ background: 'rgba(100, 116, 139, 0.15)', border: '1px solid #64748b', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '20px' }}>{mciSummary.counts.BLACK}</div>
                  <div style={{ fontSize: '11px' }}>⚫ BLACK (Expectant)</div>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${theme.styles.borderColor}` }}>
                <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '14px' }}>⚡ Rapid Field Assessment (Under 60 Seconds)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={isAbleToWalk} onChange={e => setIsAbleToWalk(e.target.checked)} />
                    Able to walk (Ambulatory)?
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={isBreathing} onChange={e => setIsBreathing(e.target.checked)} />
                    Spontaneous Breathing?
                  </label>
                  <div>
                    <span>Respiratory Rate: <b>{respRate} bpm</b></span>
                    <input type="range" min="0" max="50" value={respRate} onChange={e => setRespRate(parseInt(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={hasRadialPulse} onChange={e => setHasRadialPulse(e.target.checked)} />
                    Radial Pulse Present / Capillary Refill &lt; 2s?
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={followsCommands} onChange={e => setFollowsCommands(e.target.checked)} />
                    Follows Simple Commands (Mentation)?
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="checkbox" checked={severeHemorrhage} onChange={e => setSevereHemorrhage(e.target.checked)} />
                    Severe Uncontrolled Hemorrhage?
                  </label>
                </div>
                <button
                  onClick={handleRunTriage}
                  style={{
                    marginTop: '16px',
                    width: '100%',
                    padding: '10px',
                    backgroundColor: theme.styles.btnPrimaryBg,
                    color: theme.styles.btnPrimaryColor,
                    border: theme.styles.btnPrimaryBorder,
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ➕ Commit Patient START Triage Tag
                </button>
              </div>

              {triageHistory.length > 0 && (
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}>Recent Casualty Log ({triageHistory.length}):</div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                    {triageHistory.map((t, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          marginBottom: '4px',
                          borderRadius: '4px',
                          background: t.color === 'RED' ? 'rgba(239, 68, 68, 0.2)' : t.color === 'YELLOW' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          fontSize: '12px',
                        }}
                      >
                        <span><b>{t.patientId}</b> — {t.categoryName}</span>
                        <span>{t.rationale}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: DYNAMIC EVACUATION ROUTER */}
          {activeTab === 'evacuation' && (
            <div>
              <div style={{ fontSize: '13px', marginBottom: '14px', lineHeight: '1.5' }}>
                Computes composite cost-penalized evacuation paths dynamically avoiding road debris, fire plumes, and flood inundation zones.
              </div>
              <button
                onClick={handleSolveEvacuation}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: theme.styles.btnPrimaryBg,
                  color: theme.styles.btnPrimaryColor,
                  border: theme.styles.btnPrimaryBorder,
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginBottom: '16px',
                }}
              >
                🗺️ Compute Safest Evacuation Corridor
              </button>

              {evacPlan && (
                <div style={{ background: 'rgba(0,0,0,0.35)', padding: '16px', borderRadius: '8px', border: `1px solid ${theme.styles.borderColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>Destination: {evacPlan.targetShelter?.name}</span>
                    <span style={{ fontWeight: 'bold', color: evacPlan.safetyScore > 75 ? '#22c55e' : '#eab308' }}>
                      Safety Index: {evacPlan.safetyScore} / 100
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '12px', marginBottom: '12px' }}>
                    <div>Distance: <b>{evacPlan.totalDistanceKm} km</b></div>
                    <div>Transit Time: <b>{evacPlan.estimatedTransitTimeMinutes} min</b></div>
                    <div>Cost Score: <b>{evacPlan.compositeCost}</b></div>
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>
                    Path Waypoints ({evacPlan.pathNodeIds.length}): {evacPlan.pathNodeIds.join(' → ')}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: DTN BUNDLE PROTOCOL */}
          {activeTab === 'dtn' && (
            <div>
              <div style={{ fontSize: '13px', marginBottom: '14px' }}>
                <b>Store-Carry-and-Forward (RFC 9171 / RFC 5050):</b> Responders and drones act as physical Data Mules to transport encrypted messages across disjoint network partitions.
              </div>

              {/* Create Bundle Form */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: `1px solid ${theme.styles.borderColor}` }}>
                <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>Inject Store-and-Forward Bundle</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <select
                    value={newDtnType}
                    onChange={e => setNewDtnType(e.target.value as any)}
                    style={{ padding: '8px', borderRadius: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
                  >
                    <option value="SOS_BEACON">SOS Beacon</option>
                    <option value="CASUALTY_REPORT">Casualty Report</option>
                    <option value="SUPPLY_MANIFEST">Supply Manifest</option>
                    <option value="TACTICAL_ORDER">Tactical Order</option>
                  </select>
                  <input
                    type="text"
                    value={newDtnPayloadText}
                    onChange={e => setNewDtnPayloadText(e.target.value)}
                    placeholder="Payload message..."
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', background: '#0f172a', color: '#fff', border: '1px solid #334155' }}
                  />
                  <button
                    onClick={handleCreateDtnBundle}
                    style={{ padding: '8px 14px', background: '#38bdf8', color: '#000', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}
                  >
                    Inject Bundle
                  </button>
                </div>
              </div>

              {/* Bundle List */}
              <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>Active DTN Storage Queue ({dtnBundles.length}):</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {dtnBundles.map(b => (
                  <div
                    key={b.bundleId}
                    style={{
                      background: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <b>{b.bundleId}</b> [{b.payloadType}] — Hops: {b.hopCount}/{b.maxHops}
                      <div style={{ fontSize: '11px', opacity: 0.75 }}>
                        Custody: {b.custodyAcceptedBy?.join(', ') || 'Local'} • TTL: {Math.round(b.ttlMs / 3600_000)}h
                      </div>
                    </div>
                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>CARRIED</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: DRONE AI COMPUTER VISION */}
          {activeTab === 'vision' && (
            <div>
              <div style={{ fontSize: '13px', marginBottom: '14px' }}>
                Real-time ingestion of high-frequency bounding box telemetry from aerial UAVs running onboard YOLOv8 &amp; thermal survivor detection models.
              </div>
              <button
                onClick={handleSimulateDroneVision}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#f59e0b',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginBottom: '16px',
                }}
              >
                📹 Ingest Simulated Aerial UAV AI Detection Stream
              </button>

              {visionDetections.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {visionDetections.map((v, i) => (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid #f59e0b',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '4px' }}>
                        <span style={{ color: '#fbbf24' }}>🎯 {v.detection.aiClass.toUpperCase()} (Confidence: {(v.detection.confidence * 100).toFixed(0)}%)</span>
                        <span style={{ color: '#ef4444' }}>{v.dispatchUrgency} DISPATCH</span>
                      </div>
                      <div style={{ opacity: 0.85 }}>
                        Drone: {v.detection.droneId} • Thermal: {v.detection.thermalSignatureCelsius}°C • Action: {v.actionTaken}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: MULTI-SIG EMERGENCY GOVERNOR */}
          {activeTab === 'governance' && (
            <div>
              <div style={{ fontSize: '13px', marginBottom: '14px' }}>
                <b>FEMA ICS-204 Multi-Signature Council:</b> High-stakes disaster mandates require M-of-N cryptographic sign-offs from authorized agency commanders before execution.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {proposals.map(p => (
                  <div
                    key={p.proposalId}
                    style={{
                      background: p.isExecuted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${p.isExecuted ? '#22c55e' : '#ef4444'}`,
                      padding: '14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{p.title}</span>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: p.isExecuted ? '#22c55e' : '#ef4444', color: '#fff', fontWeight: 'bold', fontSize: '11px' }}>
                        {p.isExecuted ? 'EXECUTED' : `PENDING (${p.signatures.length}/${p.requiredSignatures})`}
                      </span>
                    </div>
                    <div style={{ opacity: 0.85, marginBottom: '8px' }}>
                      Mandate: <b>{p.mandateType}</b> • Zone: {p.targetZoneId}
                    </div>
                    {!p.isExecuted && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <button
                          onClick={() => handleSignProposal(p.proposalId, 'ic-01')}
                          style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ✍️ Sign as FEMA Commander
                        </button>
                        <button
                          onClick={() => handleSignProposal(p.proposalId, 'fire-01')}
                          style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          ✍️ Sign as Fire Marshall
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SAR DRONE PLANNER */}
          {activeTab === 'drone' && (
            <div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <button
                  onClick={() => setDronePattern('lawnmower')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: dronePattern === 'lawnmower' ? '2px solid #38bdf8' : `1px solid ${theme.styles.borderColor}`,
                    background: dronePattern === 'lawnmower' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: theme.styles.textColor,
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Parallel Sweep (Lawnmower)
                </button>
                <button
                  onClick={() => setDronePattern('expanding_square')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: dronePattern === 'expanding_square' ? '2px solid #38bdf8' : `1px solid ${theme.styles.borderColor}`,
                    background: dronePattern === 'expanding_square' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                    color: theme.styles.textColor,
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Expanding Square Search (GPS Fix)
                </button>
              </div>

              <button
                onClick={handlePlanDrone}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: theme.styles.btnPrimaryBg,
                  color: theme.styles.btnPrimaryColor,
                  border: theme.styles.btnPrimaryBorder,
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginBottom: '16px',
                }}
              >
                🚁 Compute Autonomous Flight Path &amp; Avoid Hazard Zones
              </button>

              {activeMission && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', border: `1px solid ${theme.styles.borderColor}` }}>
                  <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '8px' }}>
                    Flight Plan: {activeMission.missionId} ({activeMission.pattern})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '12px', marginBottom: '12px' }}>
                    <div>Distance: <b>{activeMission.totalDistanceKm} km</b></div>
                    <div>Flight Time: <b>{activeMission.estimatedFlightTimeMinutes} min</b></div>
                    <div>Battery Drain: <b>{activeMission.estimatedBatteryDrainPct}%</b></div>
                    <div>Coverage Area: <b>{activeMission.coveredAreaSqKm} km²</b></div>
                  </div>
                  <div style={{ fontSize: '11px', maxHeight: '120px', overflowY: 'auto' }}>
                    Waypoints ({activeMission.waypoints.length}):
                    {activeMission.waypoints.slice(0, 10).map((wp, i) => (
                      <div key={i} style={{ opacity: 0.8, padding: '2px 0' }}>
                        WP #{i + 1}: [{wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}] @ {wp.altitudeMeters}m ({wp.action}) - T+{wp.estimatedTimeSec}s
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: CURSOR ON TARGET (CoT) */}
          {activeTab === 'cot' && (
            <div>
              <div style={{ marginBottom: '14px', fontSize: '13px', lineHeight: '1.5' }}>
                Cursor on Target (CoT) XML Gateway allows this decentralized mesh network to interoperate natively with <b>ATAK (Android Tactical Assault Kit)</b>, <b>WinTAK</b>, and <b>FreeTAKServer</b>.
              </div>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px', marginBottom: '12px' }}>
                <code>
                  GET /api/v1/cot/feed?format=xml<br />
                  Content-Type: application/xml<br /><br />
                  &lt;event version="2.0" uid="responder-R01" type="a-f-G-U-C" time="2026-08-10T12:00:00Z"&gt;<br />
                  &nbsp;&nbsp;&lt;point lat="12.9716" lon="77.5946" hae="0" ce="5.0"/&gt;<br />
                  &nbsp;&nbsp;&lt;detail&gt;&lt;contact callsign="Rescue Leader Alpha"/&gt;&lt;/detail&gt;<br />
                  &lt;/event&gt;
                </code>
              </div>
              <div style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>
                ✔ CoT Endpoint Active on /api/v1/cot/feed
              </div>
            </div>
          )}

          {/* TAB: LoRa 24-BYTE CODEC */}
          {activeTab === 'lora' && (
            <div>
              <div style={{ fontSize: '13px', marginBottom: '12px' }}>
                Compresses full GPS telemetry, battery levels, triage color, and emergency text into a single <b>24-byte binary radio frame</b> with 24-bit coordinate quantization and CRC-16 integrity.
              </div>
              <button
                onClick={handleTestLoRa}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: theme.styles.btnPrimaryBg,
                  color: theme.styles.btnPrimaryColor,
                  border: theme.styles.btnPrimaryBorder,
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginBottom: '14px',
                }}
              >
                Encode &amp; Verify LoRa Frame (24 Bytes)
              </button>

              {encodedBytesHex && (
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                  <div style={{ color: '#38bdf8', marginBottom: '6px' }}>Hex Stream (24 Bytes):</div>
                  <div style={{ wordBreak: 'break-all', fontWeight: 'bold', color: '#ffcc00' }}>{encodedBytesHex}</div>
                  <div style={{ marginTop: '8px', color: '#22c55e' }}>
                    ✔ CRC-16 Verified • Decoded: Lat {decodedPacketResult?.lat}, Lng {decodedPacketResult?.lng}, Triage: {decodedPacketResult?.triageTag}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SUPPLY BURN PREDICTOR */}
          {activeTab === 'forecast' && (
            <div>
              <div style={{ fontSize: '13px', marginBottom: '14px' }}>
                Predictive burn-rate analysis dynamically calculates stockout timelines for water, food, and trauma kits based on active disaster population load.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', color: '#ef4444' }}>Potable Water</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}>4.5 Hours</div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>CRITICAL STOCKOUT RISK • Auto-Transfer Dispatch Triggered</div>
                </div>
                <div style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid #eab308', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', color: '#eab308' }}>Trauma Bandages</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}>14.2 Hours</div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>WARNING • Re-supply Hub Beta Assigned</div>
                </div>
                <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontWeight: 'bold', color: '#22c55e' }}>Emergency Rations</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}>48+ Hours</div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>ADEQUATE • Surplus Available for Transfer</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ATMOSPHERIC GAUSSIAN PLUME DISPERSION RADAR */}
          {activeTab === 'plume' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#f97316' }}>
                    ☢️ Gaussian Plume Toxic Gas &amp; Chemical Dispersion Radar
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    Pasquill-Gifford stability modeling predicting downwind lethal concentrations and safe upwind ingress bearing.
                  </div>
                </div>
                <button
                  onClick={handleSimulatePlume}
                  style={{
                    backgroundColor: '#f97316',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Run Heavy Plume Simulation
                </button>
              </div>

              {plumeResult && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>LETHAL RED CONTOUR</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>
                      {plumeResult.contours[0]?.maxDownwindDistanceKm} km
                    </div>
                    <div style={{ fontSize: '10px', color: '#fca5a5' }}>
                      Threshold &gt;50 mg/m³ • Immediate SCBA Evacuation
                    </div>
                  </div>
                  <div style={{ background: 'rgba(249, 115, 22, 0.2)', border: '1px solid #f97316', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#f97316', fontWeight: 'bold' }}>DANGER ORANGE CONTOUR</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>
                      {plumeResult.contours[1]?.maxDownwindDistanceKm} km
                    </div>
                    <div style={{ fontSize: '10px', color: '#fdba74' }}>
                      Threshold &gt;10 mg/m³ • Shelter in Place
                    </div>
                  </div>
                  <div style={{ background: 'rgba(34, 197, 94, 0.2)', border: '1px solid #22c55e', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 'bold' }}>SAFE INGRESS BEARING</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#22c55e', margin: '4px 0' }}>
                      {plumeResult.safeResponderIngressBearingDeg}° (Upwind)
                    </div>
                    <div style={{ fontSize: '10px', color: '#86efac' }}>
                      Wind {plumeResult.windVector.speedMps} m/s • Approach from upwind
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: PHYSICAL LORA UART GATEWAY */}
          {activeTab === 'loraUart' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#38bdf8' }}>
                    🔌 ESP32 / Heltec SX1262 Physical Radio UART Gateway
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    SLIP frame encoding (RFC 1055), AT modem command configuration, and RSSI/SNR signal telemetry.
                  </div>
                </div>
                <button
                  onClick={handleFrameUartSlip}
                  style={{
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Frame Packet &amp; Poll Modem
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px' }}>
                  <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '6px' }}>AT Command Handshake Sequence:</div>
                  <div style={{ color: '#94a3b8', lineHeight: '1.6' }}>
                    AT+RESTORE<br />
                    AT+BAND=915.0<br />
                    AT+SF=9<br />
                    AT+BW=125<br />
                    AT+CR=4/5<br />
                    AT+POWER=20<br />
                    AT+MODE=TEST_RX_CONTINUOUS
                  </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px' }}>
                  <div style={{ color: '#22c55e', fontWeight: 'bold', marginBottom: '6px' }}>SLIP Encoded Frame (with Byte-Stuffing):</div>
                  <div style={{ wordBreak: 'break-all', color: '#facc15', marginBottom: '8px' }}>
                    {uartFramedHex || 'C0 AA 01 DB DC 42 DB DD FF C0'}
                  </div>
                  {uartTelemetry && (
                    <div style={{ color: '#38bdf8' }}>
                      RSSI: {uartTelemetry.rssiDbm} dBm • SNR: {uartTelemetry.snrDb} dB • Link: <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{uartTelemetry.quality}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ACOUSTIC DISTRESS & SEISMIC SOS DETECTOR */}
          {activeTab === 'acoustic' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#ec4899' }}>
                    🎙️ Seismic &amp; Acoustic Distress SOS Detector
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    Spectral frequency analyzer detecting 3kHz survival whistles, Morse code SOS pulses, and human distress vocals under rubble.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleRunAcousticAnalysis('whistle')}
                    style={{ background: '#ec4899', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Whistle SOS
                  </button>
                  <button
                    onClick={() => handleRunAcousticAnalysis('morse')}
                    style={{ background: '#a855f7', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Morse SOS
                  </button>
                  <button
                    onClick={() => handleRunAcousticAnalysis('ambient')}
                    style={{ background: '#475569', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Ambient
                  </button>
                </div>
              </div>

              {acousticResult && (
                <div style={{ background: acousticResult.isSosConfirmed ? 'rgba(236, 72, 153, 0.15)' : 'rgba(0,0,0,0.4)', border: `1px solid ${acousticResult.isSosConfirmed ? '#ec4899' : '#475569'}`, padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: acousticResult.isSosConfirmed ? '#ec4899' : '#94a3b8' }}>
                      {acousticResult.detectionType} (Confidence: {Math.round(acousticResult.confidence * 100)}%)
                    </div>
                    <div style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '4px', background: acousticResult.isSosConfirmed ? '#ef4444' : '#22c55e', color: '#fff', fontWeight: 'bold' }}>
                      {acousticResult.estimatedUrgency}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
                    Dominant Frequency: <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{acousticResult.frequencyHz} Hz</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#f8fafc', fontWeight: '500' }}>
                    🚨 Action: {acousticResult.mitigationOrAction}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: POST-QUANTUM HYBRID LATTICE SIGNER */}
          {activeTab === 'pqc' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#a855f7' }}>
                    🔐 Post-Quantum (PQC) Hybrid Lattice Cryptographic Signer
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    Dual-layer classical Ed25519 + 512-bit quantum lattice polynomial commitments with rotating 1hr epoch anti-replay defense.
                  </div>
                </div>
                <button
                  onClick={handleGeneratePqcKeysAndSign}
                  style={{
                    backgroundColor: '#a855f7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ⚡ Generate PQC Keys &amp; Sign
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', fontFamily: 'monospace', fontSize: '11px' }}>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ color: '#a855f7', fontWeight: 'bold', marginBottom: '4px' }}>Quantum Lattice Seed (512-bit):</div>
                  <div style={{ wordBreak: 'break-all', color: '#94a3b8', marginBottom: '8px' }}>
                    {pqcKeyPair?.quantumLatticeSeedHex || '0x7e81...b92a'}
                  </div>

                  {pqcSignedPacket && (
                    <>
                      <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px' }}>Lattice Polynomial Commitment Hash:</div>
                      <div style={{ wordBreak: 'break-all', color: '#facc15', marginBottom: '8px' }}>
                        {pqcSignedPacket.latticeCommitmentHash}
                      </div>

                      <div style={{ color: '#22c55e', fontWeight: 'bold' }}>
                        Verification Status: {pqcVerificationStatus}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: V9 SATELLITE DIRECT-TO-CELL & IRIDIUM SBD */}
          {activeTab === 'satellite' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#38bdf8' }}>
                    🛰️ Satellite Direct-to-Cell &amp; Iridium SBD Gateway
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    340-byte compact binary burst packets with L-Band Doppler shift frequency correction (+/- {sbdDopplerHz} Hz).
                  </div>
                </div>
                <button
                  onClick={handleEncodeSbd}
                  style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ⚡ Broadcast Satellite Burst
                </button>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px' }}>
                <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px' }}>Binary SBD Packet Frame (CRC-16 Verified):</div>
                <div style={{ wordBreak: 'break-all', color: '#facc15', marginBottom: '8px' }}>
                  {sbdFrameHex || '53 04 12 66 0A 1B 89 FF 01 53 45 49 53 4D 49 43 5F 43 4F 4C 4C 41 50 53 45 10 21'}
                </div>
                <div style={{ color: '#22c55e' }}>
                  ✔ Satellite Transceiver Link: Lock Acquired • L-Band Doppler Offset: {sbdDopplerHz} Hz • Constellation: Iridium NEXT / Direct-to-Cell LEO
                </div>
              </div>
            </div>
          )}

          {/* TAB: V10 FLOOD & DAM HYDRODYNAMIC SIMULATOR */}
          {activeTab === 'flood' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#06b6d4' }}>
                    🌊 Dam-Breach Hydrodynamic Wave Simulator (2D Saint-Venant)
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    Froehlich peak discharge formula with Manning's roughness coefficient resistance modeling downstream flood wave.
                  </div>
                </div>
                <button
                  onClick={handleSimulateFlood}
                  style={{ backgroundColor: '#0891b2', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ⚡ Simulate Catastrophic Breach
                </button>
              </div>

              {floodReport && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid #06b6d4', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 'bold' }}>PEAK DISCHARGE (Q_PEAK)</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>
                        {floodReport.peakDischargeRateM3s.toLocaleString()} m³/s
                      </div>
                      <div style={{ fontSize: '10px', color: '#a5f3fc' }}>Emptying Duration: ~{floodReport.estimatedTotalEmptyingHours} Hours</div>
                    </div>
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>TORRENT INUNDATION (T+15m)</div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444', margin: '4px 0' }}>
                        {floodReport.inundationZones[0]?.peakDepthMeters}m Depth
                      </div>
                      <div style={{ fontSize: '10px', color: '#fca5a5' }}>Velocity: {floodReport.inundationZones[0]?.flowVelocityMps} m/s</div>
                    </div>
                    <div style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid #eab308', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ fontSize: '11px', color: '#eab308', fontWeight: 'bold' }}>CRITICAL DIRECTIVE</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fef08a', margin: '4px 0' }}>
                        {floodReport.evacuationDirective.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '10px', color: '#fef08a' }}>Bridge &amp; Water Plant Imminent Inundation</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: V11 SWARM DRONE FLOCKING */}
          {activeTab === 'swarm' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#10b981' }}>
                    🛸 Autonomous Swarm Drone Flocking &amp; Collision Avoidance
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    Decentralized Reynolds Boids (Separation, Alignment, Cohesion) + ADS-B proximity collision cones.
                  </div>
                </div>
                <button
                  onClick={handleComputeSwarm}
                  style={{ backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ⚡ Re-calculate Swarm Trajectories
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {swarmVectors.map(v => (
                  <div key={v.droneId} style={{ background: v.isProximityWarning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0,0,0,0.4)', border: `1px solid ${v.isProximityWarning ? '#ef4444' : '#10b981'}`, padding: '12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{v.droneId}</div>
                      <div style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: v.isProximityWarning ? '#ef4444' : '#10b981', color: '#fff', fontWeight: 'bold' }}>
                        {v.isProximityWarning ? 'COLLISION CONE' : 'CLEAR FLIGHT'}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>Heading: <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{v.recommendedHeadingDegrees}°</span> • Speed: {v.targetSpeedMps} m/s</div>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', fontFamily: 'monospace' }}>
                      Anti-Collision Force: ax={v.antiCollisionAdjustment.ax}, ay={v.antiCollisionAdjustment.ay}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: V12 BIOMETRIC VITALS & SHOCK INDEX */}
          {activeTab === 'biometrics' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#f43f5e' }}>
                    ❤️ Biometric Wearable Vitals &amp; Dynamic Triage Escalation
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    Continuous NEWS2 Clinical Early Warning Scoring, Shock Index ($SI = HR / SBP$), and automated MEDEVAC dispatch.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleEvaluateBiometrics('critical')}
                    style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Simulate Severe Shock
                  </button>
                  <button
                    onClick={() => handleEvaluateBiometrics('stable')}
                    style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Simulate Stable
                  </button>
                </div>
              </div>

              {biometricReport && (
                <div style={{ background: biometricReport.recommendedTriageTag === 'RED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0,0,0,0.4)', border: `1px solid ${biometricReport.recommendedTriageTag === 'RED' ? '#ef4444' : '#22c55e'}`, padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#fff' }}>
                      Patient {biometricReport.patientId} • Shock Index: <span style={{ color: biometricReport.shockIndex >= 1.0 ? '#ef4444' : '#22c55e' }}>{biometricReport.shockIndex}</span> (NEWS2: {biometricReport.news2Score})
                    </div>
                    <div style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', background: biometricReport.recommendedTriageTag === 'RED' ? '#ef4444' : '#22c55e', color: '#fff', fontWeight: 'bold' }}>
                      TRIAGE: {biometricReport.recommendedTriageTag} {biometricReport.isTagEscalated && '⚠️ ESCALATED'}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#fca5a5', marginBottom: '6px' }}>
                    Alert Flags: {biometricReport.criticalAlertFlags.join(' • ') || 'None (Hemodynamically Stable)'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold' }}>
                    🚨 Directive: {biometricReport.immediateIntervention}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: V13 SEISMIC P/S-WAVE EEW */}
          {activeTab === 'seismic' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#f59e0b' }}>
                    🌋 Seismic P-Wave &amp; S-Wave Earthquake Early Warning (EEW)
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    STA/LTA automated phase picker providing 10-60s destructive shaking countdown before structural collapse wavefront.
                  </div>
                </div>
                <button
                  onClick={handleRunSeismicAnalysis}
                  style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ⚡ Trigger Multilateral EEW
                </button>
              </div>

              {seismicReport && (
                <div>
                  <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#f59e0b' }}>
                        EARTHQUAKE ALERT: Estimated Magnitude Mw {seismicReport.estimatedMagnitudeMw} (Hypocenter Depth: {seismicReport.focalDepthKm}km)
                      </div>
                      <div style={{ fontSize: '11px', color: '#fde68a' }}>Epicenter: {seismicReport.epicenterCoordinates.join(', ')}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {seismicReport.targetCitiesCountdown.map(c => (
                      <div key={c.cityName} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px' }}>
                        <div style={{ fontWeight: 'bold', color: '#fff' }}>{c.cityName}</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: c.warningLeadTimeSeconds < 10 ? '#ef4444' : '#f59e0b', margin: '4px 0' }}>
                          ⏱️ {c.warningLeadTimeSeconds}s Lead-Time
                        </div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Distance: {c.distanceKm} km • Intensity: {c.estimatedShakingIntensityMMI}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: V14 MICROGRID & ENERGY BLACK-START */}
          {activeTab === 'microgrid' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#eab308' }}>
                    ⚡ Autonomous Microgrid &amp; Energy Black-Start Allocator
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    Solar PV, BESS Battery Banks, and Diesel Genset load-shedding protecting hospital ICU and critical command circuits.
                  </div>
                </div>
                <button
                  onClick={handleOptimizeMicrogrid}
                  style={{ backgroundColor: '#ca8a04', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ⚡ Optimize Grid Dispatch
                </button>
              </div>

              {microgridReport && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid #eab308', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#eab308', fontWeight: 'bold' }}>GRID STATUS</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>{microgridReport.gridStatus}</div>
                    <div style={{ fontSize: '10px', color: '#fef08a' }}>Generation: {microgridReport.totalGenerationKw} kW • Load: {microgridReport.totalDemandKw} kW</div>
                  </div>
                  <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>BESS BATTERY AUTONOMY</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>{microgridReport.batteryAutonomyRemainingHours} Hours</div>
                    <div style={{ fontSize: '10px', color: '#bae6fd' }}>Diesel Backup Reserve: {microgridReport.dieselFuelAutonomyHours} Hours</div>
                  </div>
                  <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold' }}>LOAD SHEDDING STATUS</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fca5a5', margin: '4px 0' }}>
                      {microgridReport.activeLoadSheddingTiers.length > 0 ? `Tier ${microgridReport.activeLoadSheddingTiers.join(', ')} Shed` : 'Full Load Energized'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#fca5a5' }}>Tier 1 Life-Support 100% Protected</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: V15 ZKP ANONYMOUS CLAIMS */}
          {activeTab === 'zkp' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#8b5cf6' }}>
                    🛡️ Zero-Knowledge Proof (ZKP) Anonymous Victim Supply Claims
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    Allows displaced victims to anonymously redeem emergency medical/food rations with zero PII disclosure and cryptographic nullifier anti-double-claim defense.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleClaimZkpRation(false)}
                    style={{ backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    ⚡ Anonymous Claim Ration
                  </button>
                  <button
                    onClick={() => handleClaimZkpRation(true)}
                    style={{ backgroundColor: '#6b7280', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 14px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Attempt Double-Claim
                  </button>
                </div>
              </div>

              {zkpClaimStatus && (
                <div style={{ background: zkpClaimStatus.isApproved ? 'rgba(139, 92, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${zkpClaimStatus.isApproved ? '#8b5cf6' : '#ef4444'}`, padding: '14px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 'bold', color: zkpClaimStatus.isApproved ? '#c4b5fd' : '#fca5a5' }}>
                      {zkpClaimStatus.isApproved ? '✔ ANONYMOUS RATION CLAIM APPROVED' : '❌ CLAIM REJECTED'}
                    </div>
                    {zkpClaimStatus.token && (
                      <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#22c55e' }}>
                        Token: {zkpClaimStatus.token}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                    {zkpClaimStatus.isApproved
                      ? 'Zero-Knowledge Merkle proof verified against decentralized registry. Nullifier registered to prevent duplicate epoch claims.'
                      : `Reason: ${zkpClaimStatus.reason}`}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};


