import { defineStore } from "pinia";
import { ref, computed } from 'vue';
import { fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import api from "./api";
import { type MetaData, type NodeData, type UserData, type InputSchema, type CommandLog } from "../models";

export const useStore = defineStore('auth', () => {
  const user = ref<UserData | null>(null);
  const loading = ref<boolean>(false);
  const vessels = ref<MetaData[] | null>(null);
  const nodes = ref<MetaData[] | null>(null);
  const sensors = ref<MetaData[] | null>(null);
  const timeframes = ref<string[]>([]);
  const commandHistory = ref<{[key: string] : CommandLog[]}>({});
  const users = ref<{email: string, status: string}[]>([]);

  const schemas = ref<{
    node: InputSchema[],
    vessel: InputSchema[],
    sensor: InputSchema[]
  }>({node: [], vessel: [], sensor: []});

  const selectedNodeData = ref<NodeData>(
    {
      loading: false,
      nodeId: null,
      node: {
        meta: null,
        error: null,
      },
      vessel: {
        meta: null,
        error: null,
      },
      sensors: {
        types: [],
        metas: {},
        data: {},
        error: null,
      }
    }
  );

  async function fetchTimeframes() {
    apiCall(async () => timeframes.value = await api.fetchTimeframes());
  }

  async function fetchUser() {
    try {
      const current = await getCurrentUser();
      const session = await fetchAuthSession();
      const rawGroups = session.tokens?.idToken?.payload?.['cognito:groups'];
      const groups = Array.isArray(rawGroups) ? rawGroups : [];
      const admin = groups.includes('Admin');

      user.value = {
        user: current,
        isAdmin: admin
      };
    } catch {
      user.value = null;
    }
  }

  async function fetchNodeData(id : string) {
    selectedNodeData.value = {
      loading: true,
      nodeId: id,
      node: {
        meta: null,
        error: null,
      },
      vessel: {
        meta: null,
        error: null,
      },
      sensors: {
        types: [],
        metas: {},
        data: {
        },
        error: null,
      }
    }

    await fetchNodes();
    await fetchVessels();

    try {
      const nodeMeta = await getNodeById(id);
      console.log("Node Meta: ", nodeMeta);
      selectedNodeData.value.node.meta = nodeMeta;
    }
    catch(ex) {
      selectedNodeData.value.node.error = String(ex);
    }

    try {
      const vesselMeta = await getVesselByNode(id);
      console.log("Vessel Meta: ", vesselMeta);
      selectedNodeData.value.vessel.meta = vesselMeta;
    }
    catch(ex) {
      selectedNodeData.value.vessel.error = String(ex);
    }

    var containsDistance = false;
    try{
      const sensorMetas = await getSensorsForNode(id);
      console.log("Sensor Metas: ", sensorMetas);
      for(const meta of sensorMetas) {
        if(meta.Sensor_type == "distance"){
          containsDistance = true;
          selectedNodeData.value.sensors.types.push("fill");
        }
          
        selectedNodeData.value.sensors.types.push(meta.Sensor_type);
        selectedNodeData.value.sensors.metas[meta.Sensor_type] = meta;
      }
    }
    catch(ex) {
      selectedNodeData.value.sensors.error = String(ex);
    }
    
    var vesselMeta = (containsDistance && selectedNodeData.value.vessel.meta ? selectedNodeData.value.vessel.meta : null);

    for(const timeframe of timeframes.value) {
      try {
        var sensorData;
        if(timeframe === "NOW")
          sensorData = await getSensorData(id, selectedNodeData.value.sensors.types, vesselMeta);
        else
          sensorData = await getHistoricSensorData(id, selectedNodeData.value.sensors.types, timeframe, vesselMeta);

        console.log(`Sensor Data for timeframe ${timeframe}: `, sensorData);
        selectedNodeData.value.sensors.data[timeframe] = sensorData;
      }
      catch(ex) {
        selectedNodeData.value.sensors.error = String(ex);
      }
    }

    selectedNodeData.value.loading = false;
  }

  async function fetchVessels() {
    await apiCall(async () => {
      vessels.value = await api.fetchVessels();

      if (!vessels.value) return;

      for (const vessel of vessels.value) {
        try {
          const node = await getNodeByVessel(vessel.id);
          vessel["Node ID"] = node.id;
        }
        catch(ex) {
          console.log(ex);
        }
      }
    });
  }

  async function getVesselByNode(id: string) {
    await fetchVessels();
    if(vessels.value != null && vessels.value.length > 0)
      for(const vessel of vessels.value){
        if(vessel["Node ID"] == id){
          return vessel;
        }
      }
    return null;
  }

  async function getNodeById(id : string) {
    await fetchNodes();

    if(nodes.value == null){
      return null;
    }

    for(const station of nodes.value){
      if(station.id == id){
        return station;
      }
    }
    return null;
  }

  async function getNodeByVessel(id: number) {
    const nodes = await apiCall(() => api.fetchNodesByVessel(id));
    
    if (Array.isArray(nodes) && nodes.length > 0) {
      return nodes[0];
    }
    return null;
  }

  async function fetchNodes() {
    apiCall(async () => nodes.value = await api.fetchAllNodes());
  }

  async function fetchSensors() {
    await apiCall(async () => {
      try {
        sensors.value = await api.fetchAllSensors();
      }
      catch(ex){
        console.error(ex);
      }
    });
  }

  async function getSensorsForNode(nodeID : string) {
    await fetchUser();

    if(user.value == null)
      throw "User is not authenticated";

    try {
      return await api.fetchSensors(nodeID);
    }
    catch(ex) {
      throw String(ex);
    }
  }

  async function fetchSensorData() {
    const nodeID = selectedNodeData.value.node.meta?.id ?? null;
    const types = selectedNodeData.value.sensors.types ?? null;
    const vesselMeta = selectedNodeData.value.vessel.meta ?? null;

    if(!nodeID || !types)
      return;

    const data = await getSensorData(nodeID, types, vesselMeta);
    selectedNodeData.value.sensors.data["NOW"] = data;
  }

  async function getSensorData(nodeID : string, types : string[], vesselMeta : MetaData | null = null) {
    await fetchUser();

    if(user.value == null)
      throw "User is not authenticated";

    try {
      const data = await api.fetchSensorData(types, nodeID);
      if(!vesselMeta || !vesselMeta.Vessel_height || !data["distance"]){
        console.log("Cant calculate fill");
        return data;
      }
        

      try {
        data["fill"] = {
          lastSeen: data["distance"].lastSeen,
          data: data["distance"].data.map((entry : any) => {
            var fill = ((vesselMeta.Vessel_height - entry.value) / vesselMeta.Vessel_height) *100;
            console.log("Calculated fill: ", fill);
            if(fill < 0)
              fill = 0;
            if(fill > 100)
              fill = 100;
            return {
              timestamp: entry.timestamp,
              value: fill
            };
          }),
          lastValue: () => {
            var fill = ((vesselMeta.Vessel_height - data["distance"].lastValue) / vesselMeta.Vessel_height) *100;
            if(fill < 0)
              fill = 0;
            if(fill > 100)
              fill = 100;
            return {
              timestamp: data["distance"].lastValue.timestamp,
              value: fill
            };
          }
        }
        return data;
      }
      catch(ex) {
        return data;
      }
    }
    catch(ex) {
      throw String(ex);
    }
  }

  async function getHistoricSensorData(nodeID : string, types : string[], timeframe : string, vesselMeta : MetaData | null = null) {
    await fetchUser();

    if(user.value == null)
      throw "User is not authenticated";

    try {
      const data = await api.fetchHistoricSensorData(types, nodeID, timeframe);
      if(!vesselMeta || !vesselMeta.Vessel_height || !data["distance"])
        return data;

      try {
        data["fill"] = {
          lastSeen: data["distance"].lastSeen,
          data: data["distance"].data.map((entry : any) => {
            var fill = ((vesselMeta.Vessel_height - entry.value) / vesselMeta.Vessel_height) *100;
            console.log("Calculated fill: ", fill);
            if(fill < 0)
              fill = 0;
            if(fill > 100)
              fill = 100;
            return {
              timestamp: entry.timestamp,
              value: fill
            };
          }),
          lastValue: () => {
            var fill = ((vesselMeta.Vessel_height - data["distance"].lastValue) / vesselMeta.Vessel_height) *100;
            if(fill < 0)
              fill = 0;
            if(fill > 100)
              fill = 100;
            return {
              timestamp: data["distance"].lastValue.timestamp,
              value: fill
            };
          }
        }
        return data;
      }
      catch(ex) {
        return data;
      }
    }
    catch(ex) {
      throw String(ex);
    }
  }

  async function fetchSchemas() {
    schemas.value.vessel = await apiCall(() => api.fetchSchema("vessel")) ?? [];
    schemas.value.node = await apiCall(() => api.fetchSchema("measuring_station")) ?? [];
    schemas.value.sensor = await apiCall(() => api.fetchSchema("sensor")) ?? [];
  }

  async function sendCommand(id: string, key: string, payload: any) {
    try {
      await api.sendCommand(id, key, payload);
      if(!commandHistory.value[id])
        commandHistory.value[id] = [];
      commandHistory.value[id].push({timestamp: Date.now(), direction: "OUTBOUND", command: "QUEUE", message: {key: key, payload: payload}});
    }
    catch(ex) {
      console.log("Failed to send command: ", ex);
    }
  }

  async function createResource(type: string, data : any) {
    try {
      loading.value = true;
      await api.createResource(type, data);
      switch(type){
        case "measuring_station": await fetchNodes(); break;
        case "vessel": await fetchVessels(); break;
        case "sensor": await fetchSensors(); break;
        default: break;
      }
    }
    catch(ex) {
      console.log("Failed to create resource: ", ex);
    }
    finally {
      loading.value = false;
    }
  }

  async function editResource(type: string, id: string | number, data: {[key : string] : string | null}) {
    try {
      loading.value = true;
      await api.saveMeta(type, id, data);
      switch(type){
        case "station": await fetchNodes(); break;
        case "vessel": await fetchVessels(); break;
        case "sensor": await fetchSensors(); break;
        default: break;
      }
    }
    catch(ex) {
      console.log("Failed to edit resource: ", ex);
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteResource(type: string, ids: string[] | number[]) {
    try {
      loading.value = true;
      for(const id of ids)
        await api.deleteResource(type, id);
      switch(type){
        case "station": await fetchNodes(); break;
        case "vessel": await fetchVessels(); break;
        case "sensor": await fetchSensors(); break;
        default: break;
      }
    }
    catch(ex) {
      console.log("Failed to delete resource: ", ex);
    }
    finally {
      loading.value = false;
    }
  }

  async function fetchUsers() {
    try {
      loading.value = true;
      users.value = await api.fetchUsers();
    }
    catch(ex) {
      console.log("Failed to fetch users: ", ex);
    }
    finally {
      loading.value = false;
    }
  }

  async function addUser(email : string) {
    try {
      loading.value = true;
      await api.addUser(email);
      await fetchUsers();
    }
    catch(ex) {
      console.log("Failed to add user: ", ex);
    }
    finally {
      loading.value = false;
    }
  }

  async function removeUsers(emails : string[]) {
    try {
      loading.value = true;
      for(const email of emails){
        try {
          await api.removeUser(email);
        }
        catch(ex) {
          console.log("Failed to remove user: ", ex);
        }
      }
      await api.fetchUsers();
    }
    catch(ex) {
      console.log("Failed finalizing user removal: ", ex);
    }
    finally {
      loading.value = false;
    }
  }

  async function apiCall<T>(fn: () => Promise<T>): Promise<T | undefined> {
    await fetchUser();
    loading.value = true;

    if(user.value == null) {
      loading.value = false;
      return undefined;
    }

    try {
      var res = await fn();
      loading.value = false;
      return res;
    } catch (ex) {
      console.error(ex);
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  Hub.listen('auth', (data) => {
    const { event } = data.payload;
    if (['signedIn', 'signedOut', 'tokenRefresh'].includes(event)) {
      fetchUser();
    }
  });

  fetchUser();
  fetchTimeframes();
  fetchSchemas();

  const isLoggedIn = computed(() => !!user.value);

  return {
    user,
    isLoggedIn,
    loading,
    nodes,
    vessels,
    sensors,
    timeframes,
    selectedNodeData,
    schemas,
    commandHistory,
    users,

    fetchUser,
    fetchNodes,
    fetchVessels,
    fetchSensors,
    fetchNodeData,
    fetchTimeframes,
    sendCommand,
    fetchSensorData,
    createResource,
    editResource,
    deleteResource,
    fetchUsers,
    addUser,
    removeUsers
  };
});