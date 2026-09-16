import { describe, it, expect, beforeEach } from 'vitest';
import { topologyService } from './services/topologyService';
import { emergencyStore } from './services/emergencyStore';

describe('Enterprise Topology Mesh & Bulk Ingestion Engine', () => {
  beforeEach(() => {
    // Reset stores if needed
  });

  describe('TopologyService', () => {
    it('should initialize with canonical disaster corridors and calculate metrics', () => {
      const corridors = topologyService.getAll();
      expect(corridors.length).toBeGreaterThanOrEqual(6);

      const metrics = topologyService.getMetrics();
      expect(metrics.totalCorridors).toBe(corridors.length);
      expect(metrics.activeCorridors).toBeGreaterThan(0);
      expect(metrics.avgHopLatencyMs).toBeGreaterThan(0);
      expect(metrics.totalThroughputMbps).toBeGreaterThan(0);
      expect(metrics.encryptionCompliancePct).toBeGreaterThan(0);
    });

    it('should dynamically provision a new tactical mesh corridor', () => {
      const corridor = topologyService.provision({
        sourceNode: 'Field Hospital Mobile Alpha',
        targetNode: 'FEMA Air Ops Dispatch',
        protocol: 'Satellite-SBD',
        bandwidthMbps: 5.5,
        latencyMs: 120.0,
        encryption: 'PQC-Kyber',
      });

      expect(corridor.id).toBeDefined();
      expect(corridor.sourceNode).toBe('Field Hospital Mobile Alpha');
      expect(corridor.protocol).toBe('Satellite-SBD');
      expect(corridor.status).toBe('active');

      const found = topologyService.getById(corridor.id);
      expect(found).toBeDefined();
      expect(found?.targetNode).toBe('FEMA Air Ops Dispatch');
    });

    it('should sever an emergency relay corridor with 1-click control', () => {
      const created = topologyService.provision({
        sourceNode: 'Compromised Perimeter Node',
        targetNode: 'Command Center',
      });

      const severed = topologyService.sever(created.id);
      expect(severed).toBe(true);
      expect(topologyService.getById(created.id)).toBeUndefined();
    });

    it('should parse and bulk ingest mesh corridors from CSV', () => {
      const csv = `sourceNode,targetNode,protocol,bandwidthMbps,latencyMs,encryption,environment
FEMA Logistics Staging,Helipad Triage 1,WebRTC-Mesh,50.0,12.0,PQC-Kyber,operational
Helipad Triage 1,Wildfire Lookout 3,LoRa-P2P,1.8,95.0,AES-256-GCM,contingency`;

      const parsed = topologyService.parseCSV(csv);
      expect(parsed.length).toBe(2);
      expect(parsed[0].sourceNode).toBe('FEMA Logistics Staging');
      expect(parsed[0].protocol).toBe('WebRTC-Mesh');
      expect(parsed[1].targetNode).toBe('Wildfire Lookout 3');
      expect(parsed[1].protocol).toBe('LoRa-P2P');

      const bulkResult = topologyService.bulkCreate(parsed);
      expect(bulkResult.length).toBe(2);
      expect(bulkResult[0].id).toBeDefined();
    });

    it('should execute universal corridor purge', () => {
      const initialCount = topologyService.getAll().length;
      expect(initialCount).toBeGreaterThan(0);

      const deleted = topologyService.deleteAll();
      expect(deleted).toBe(initialCount);
      expect(topologyService.getAll().length).toBe(0);

      // Re-provision baseline corridors for other tests
      topologyService.provision({
        sourceNode: 'FEMA ICP',
        targetNode: 'Triage Center',
        protocol: 'WebRTC-Mesh',
      });
      expect(topologyService.getAll().length).toBe(1);
    });
  });

  describe('EmergencyStore (Resilient Autonomous Ingestion & Deletion)', () => {
    it('should retrieve canonical hazard zones, resources, and responders', () => {
      const zones = emergencyStore.getZones();
      expect(zones.length).toBeGreaterThanOrEqual(1);
      expect(zones[0].geometry.type).toBe('Polygon');

      const resources = emergencyStore.getResources();
      expect(resources.length).toBeGreaterThanOrEqual(1);
      expect(resources[0].resources.length).toBeGreaterThan(0);

      const responders = emergencyStore.getResponders();
      expect(responders.length).toBeGreaterThanOrEqual(1);
      expect(responders[0].role).toBeDefined();
    });

    it('should parse and bulk ingest hazard zones from CSV', () => {
      const csv = `name,dangerLevel,lng,lat,description
Coastal Storm Surge Alpha,critical,-118.48,34.01,Severe 12ft storm surge inundating coastline.
Toxic Gas Leak Bravo,high,-118.32,34.08,Chlorine gas cylinder breach in storage warehouse.`;

      const parsed = emergencyStore.parseZoneCSV(csv);
      expect(parsed.length).toBe(2);
      expect(parsed[0].name).toBe('Coastal Storm Surge Alpha');
      expect(parsed[0].dangerLevel).toBe('critical');
      expect(parsed[0].geometry?.coordinates[0].length).toBe(5);

      const created = emergencyStore.bulkCreateZones(parsed);
      expect(created.length).toBe(2);
      expect(created[0]._id).toBeDefined();
      expect(created[0].active).toBe(true);
    });

    it('should parse and bulk ingest resource supply hubs from CSV', () => {
      const csv = `name,lng,lat,type,quantity,unit,capacity
Airfield Relief Depot,-118.35,34.12,Whole Blood Type O-,250,Units,8000
Red Cross Mobile Kitchen,-118.28,34.04,Hot Nutrient Meals,1500,Meals,4000`;

      const parsed = emergencyStore.parseResourceCSV(csv);
      expect(parsed.length).toBe(2);
      expect(parsed[0].name).toBe('Airfield Relief Depot');
      expect(parsed[0].resources?.[0].type).toBe('Whole Blood Type O-');
      expect(parsed[0].resources?.[0].quantity).toBe(250);

      const created = emergencyStore.bulkCreateResources(parsed);
      expect(created.length).toBe(2);
      expect(created[0].capacity).toBe(8000);
    });

    it('should parse and bulk ingest field responders from CSV', () => {
      const csv = `name,role,status,lng,lat,battery
Lt. James Sterling,rescue_diver,active,-118.45,34.02,85
Dr. Chloe Kim,medic,en_route,-118.38,34.06,94`;

      const parsed = emergencyStore.parseResponderCSV(csv);
      expect(parsed.length).toBe(2);
      expect(parsed[0].name).toBe('Lt. James Sterling');
      expect(parsed[0].role).toBe('rescue_diver');
      expect(parsed[0].batteryPct).toBe(85);

      const created = emergencyStore.bulkCreateResponders(parsed);
      expect(created.length).toBe(2);
      expect(created[1].status).toBe('en_route');
    });

    it('should perform universal deletion and cascading deactivation across all entities', () => {
      // Test individual deletions
      const testZone = emergencyStore.createZone({ name: 'Deletable Hazard Zone' });
      expect(emergencyStore.deleteZone(testZone._id)).toBe(true);
      expect(emergencyStore.getZones().find(z => z._id === testZone._id)).toBeUndefined();

      const testHub = emergencyStore.createResource({ name: 'Deletable Resource Hub' });
      expect(emergencyStore.deleteResource(testHub._id)).toBe(true);

      const testResp = emergencyStore.createResponder({ name: 'Deletable Responder' });
      expect(emergencyStore.deleteResponder(testResp._id)).toBe(true);

      // Universal purges
      const deletedZones = emergencyStore.deleteAllZones();
      expect(deletedZones).toBeGreaterThanOrEqual(0);
      expect(emergencyStore.getZones().length).toBe(0);

      const deletedHubs = emergencyStore.deleteAllResources();
      expect(deletedHubs).toBeGreaterThanOrEqual(0);
      expect(emergencyStore.getResources().length).toBe(0);

      const deletedResponders = emergencyStore.deleteAllResponders();
      expect(deletedResponders).toBeGreaterThanOrEqual(0);
      expect(emergencyStore.getResponders().length).toBe(0);

      // Re-seed baseline data for ongoing system operation
      emergencyStore.createZone({ name: 'Wildfire Hazard Perimeter — Sector 4', dangerLevel: 'critical' });
      emergencyStore.createResource({ name: 'FEMA Logistics Staging Area (Central Depot)' });
      emergencyStore.createResponder({ name: 'Capt. Marcus Vance', role: 'firefighter' });
      expect(emergencyStore.getZones().length).toBe(1);
      expect(emergencyStore.getResources().length).toBe(1);
      expect(emergencyStore.getResponders().length).toBe(1);
    });
  });
});
