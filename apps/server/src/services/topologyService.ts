export interface MeshCorridor {
  id: string;
  sourceNode: string;
  targetNode: string;
  protocol: 'WebRTC-Mesh' | 'LoRa-P2P' | 'Satellite-SBD' | 'UHF-Tactical' | 'gRPC-Tunnel';
  bandwidthMbps: number;
  latencyMs: number;
  packetLoss: number;
  encryption: 'PQC-Kyber' | 'ECDH-P256' | 'AES-256-GCM';
  status: 'active' | 'degraded' | 'severed';
  environment: 'operational' | 'contingency' | 'evacuation';
  lastHeartbeat: string;
}

export interface TopologyMetrics {
  totalCorridors: number;
  activeCorridors: number;
  avgHopLatencyMs: number;
  avgPacketLossPct: number;
  totalThroughputMbps: number;
  encryptionCompliancePct: number;
}

class TopologyService {
  private corridors: MeshCorridor[] = [
    {
      id: 'corridor-alpha-01',
      sourceNode: 'FEMA Incident Command Post (ICP)',
      targetNode: 'Primary Triage Center - Station 4',
      protocol: 'WebRTC-Mesh',
      bandwidthMbps: 45.2,
      latencyMs: 14.5,
      packetLoss: 0.2,
      encryption: 'PQC-Kyber',
      status: 'active',
      environment: 'operational',
      lastHeartbeat: new Date().toISOString(),
    },
    {
      id: 'corridor-beta-02',
      sourceNode: 'Primary Triage Center - Station 4',
      targetNode: 'Mobile Medical Unit (MMU-Bravo)',
      protocol: 'LoRa-P2P',
      bandwidthMbps: 2.4,
      latencyMs: 82.0,
      packetLoss: 1.4,
      encryption: 'AES-256-GCM',
      status: 'active',
      environment: 'operational',
      lastHeartbeat: new Date().toISOString(),
    },
    {
      id: 'corridor-gamma-03',
      sourceNode: 'FEMA Incident Command Post (ICP)',
      targetNode: 'Autonomous Drone Relay Swarm 9',
      protocol: 'gRPC-Tunnel',
      bandwidthMbps: 120.0,
      latencyMs: 6.8,
      packetLoss: 0.05,
      encryption: 'PQC-Kyber',
      status: 'active',
      environment: 'operational',
      lastHeartbeat: new Date().toISOString(),
    },
    {
      id: 'corridor-delta-04',
      sourceNode: 'Autonomous Drone Relay Swarm 9',
      targetNode: 'Wildfire Perimeter Sensor Mesh - Alpha',
      protocol: 'UHF-Tactical',
      bandwidthMbps: 8.5,
      latencyMs: 44.2,
      packetLoss: 3.1,
      encryption: 'ECDH-P256',
      status: 'active',
      environment: 'contingency',
      lastHeartbeat: new Date().toISOString(),
    },
    {
      id: 'corridor-epsilon-05',
      sourceNode: 'FEMA Incident Command Post (ICP)',
      targetNode: 'Emergency Evacuation Hub - South Point',
      protocol: 'Satellite-SBD',
      bandwidthMbps: 1.2,
      latencyMs: 240.0,
      packetLoss: 4.8,
      encryption: 'PQC-Kyber',
      status: 'degraded',
      environment: 'evacuation',
      lastHeartbeat: new Date().toISOString(),
    },
    {
      id: 'corridor-zeta-06',
      sourceNode: 'Emergency Evacuation Hub - South Point',
      targetNode: 'Logistics Supply Depot (Central Water & Blood)',
      protocol: 'WebRTC-Mesh',
      bandwidthMbps: 35.0,
      latencyMs: 19.8,
      packetLoss: 0.4,
      encryption: 'AES-256-GCM',
      status: 'active',
      environment: 'operational',
      lastHeartbeat: new Date().toISOString(),
    },
  ];

  public getAll(): MeshCorridor[] {
    return [...this.corridors];
  }

  public getById(id: string): MeshCorridor | undefined {
    return this.corridors.find((c) => c.id === id);
  }

  public getMetrics(): TopologyMetrics {
    const total = this.corridors.length;
    if (total === 0) {
      return {
        totalCorridors: 0,
        activeCorridors: 0,
        avgHopLatencyMs: 0,
        avgPacketLossPct: 0,
        totalThroughputMbps: 0,
        encryptionCompliancePct: 100,
      };
    }
    const active = this.corridors.filter((c) => c.status === 'active').length;
    const totalLatency = this.corridors.reduce((acc, c) => acc + c.latencyMs, 0);
    const totalLoss = this.corridors.reduce((acc, c) => acc + c.packetLoss, 0);
    const totalThroughput = this.corridors.reduce((acc, c) => acc + c.bandwidthMbps, 0);
    const pqcCount = this.corridors.filter((c) => c.encryption === 'PQC-Kyber').length;

    return {
      totalCorridors: total,
      activeCorridors: active,
      avgHopLatencyMs: Math.round((totalLatency / total) * 10) / 10,
      avgPacketLossPct: Math.round((totalLoss / total) * 100) / 100,
      totalThroughputMbps: Math.round(totalThroughput * 10) / 10,
      encryptionCompliancePct: Math.round((pqcCount / total) * 100),
    };
  }

  public provision(data: Partial<MeshCorridor>): MeshCorridor {
    const id = data.id || `corridor-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newCorridor: MeshCorridor = {
      id,
      sourceNode: data.sourceNode || 'FEMA Incident Command Post (ICP)',
      targetNode: data.targetNode || 'Tactical Field Relay',
      protocol: data.protocol || 'WebRTC-Mesh',
      bandwidthMbps: Number(data.bandwidthMbps) || 25.0,
      latencyMs: Number(data.latencyMs) || 20.0,
      packetLoss: Number(data.packetLoss) || 0.1,
      encryption: data.encryption || 'PQC-Kyber',
      status: data.status || 'active',
      environment: data.environment || 'operational',
      lastHeartbeat: new Date().toISOString(),
    };
    this.corridors.push(newCorridor);
    return newCorridor;
  }

  public sever(id: string): boolean {
    const idx = this.corridors.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.corridors.splice(idx, 1);
    return true;
  }

  public deleteAll(): number {
    const count = this.corridors.length;
    this.corridors = [];
    return count;
  }

  public bulkCreate(items: Partial<MeshCorridor>[]): MeshCorridor[] {
    const created: MeshCorridor[] = [];
    for (const item of items) {
      if (item.sourceNode && item.targetNode) {
        created.push(this.provision(item));
      }
    }
    return created;
  }

  public parseCSV(csvContent: string): Partial<MeshCorridor>[] {
    const lines = csvContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const sourceIdx = headers.findIndex((h) => h.includes('source') || h.includes('from'));
    const targetIdx = headers.findIndex((h) => h.includes('target') || h.includes('to'));
    const protocolIdx = headers.findIndex((h) => h.includes('protocol'));
    const bwIdx = headers.findIndex((h) => h.includes('bandwidth') || h.includes('mbps'));
    const latencyIdx = headers.findIndex((h) => h.includes('latency') || h.includes('ms'));
    const lossIdx = headers.findIndex((h) => h.includes('loss'));
    const encIdx = headers.findIndex((h) => h.includes('encryption') || h.includes('crypto'));
    const envIdx = headers.findIndex((h) => h.includes('env'));

    const parsed: Partial<MeshCorridor>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 2) continue;

      const sourceNode = sourceIdx !== -1 ? cols[sourceIdx] : cols[0];
      const targetNode = targetIdx !== -1 ? cols[targetIdx] : cols[1];
      if (!sourceNode || !targetNode) continue;

      const rawProto = protocolIdx !== -1 ? cols[protocolIdx] : 'WebRTC-Mesh';
      const validProtos = ['WebRTC-Mesh', 'LoRa-P2P', 'Satellite-SBD', 'UHF-Tactical', 'gRPC-Tunnel'] as const;
      const protocol = (validProtos.find((p) => p.toLowerCase() === rawProto.toLowerCase()) || 'WebRTC-Mesh') as MeshCorridor['protocol'];

      const rawEnc = encIdx !== -1 ? cols[encIdx] : 'PQC-Kyber';
      const validEncs = ['PQC-Kyber', 'ECDH-P256', 'AES-256-GCM'] as const;
      const encryption = (validEncs.find((e) => e.toLowerCase() === rawEnc.toLowerCase()) || 'PQC-Kyber') as MeshCorridor['encryption'];

      parsed.push({
        sourceNode,
        targetNode,
        protocol,
        bandwidthMbps: bwIdx !== -1 ? parseFloat(cols[bwIdx]) || 10.0 : 10.0,
        latencyMs: latencyIdx !== -1 ? parseFloat(cols[latencyIdx]) || 25.0 : 25.0,
        packetLoss: lossIdx !== -1 ? parseFloat(cols[lossIdx]) || 0.5 : 0.5,
        encryption,
        environment: (envIdx !== -1 ? cols[envIdx] : 'operational') as MeshCorridor['environment'],
        status: 'active',
      });
    }
    return parsed;
  }
}

export const topologyService = new TopologyService();
