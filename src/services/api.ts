import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth'
import type { InputSchema, MetaData, SensorData } from '../models';

var dataApiUrl = '';
if(true)
    dataApiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev';
else
    dataApiUrl = 'http://localhost:51234/test';

//Time frame endpoint: /meta/app/timeframe

export default {
    async fetchTimeframes() {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken?.toString();

            const res = await axios.get(`${dataApiUrl}/meta/app/timeframe`, {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`Requested Timeframes on ${dataApiUrl}/meta/app/timeframe got: `, res);
            return res.data.timeframes;
        } catch (err) {
            console.error(`Loading of timeframes failed:`, err)
            return [];
        }
    },

    async fetchVessels() {
        return await requestMetaData(`${dataApiUrl}/meta/vessel/all`, ["Vessel_ID", "id"], (o) => {//, "vessel", ["Vessel_ID", "Vessel_location"], (o) => {
            return {
                id: o.Vessel_ID,
        //        location: o.Vessel_location
            }
        });
    },

    async fetchVesselByNode(id : string) {
        try {
            const vessels = await this.fetchVessels();

            for(const vessel of vessels) {
                if(vessel.id == id)
                    return vessel;
            }
        } catch (err) {
            console.error('Loading of Vessel by station id failed:', err);
        }
        finally{
            return null;
        }
    },

    async fetchNodesByVessel(id : number) {
        return await requestMetaData(`${dataApiUrl}/meta/vms?vessel_id=${id}`, ["id", "Measuring_station_ID", "internal_id"], (o) => {//, "station", ["Measuring_station_ID", "Vessel_ID", "Station_location"], (o) => {
            return {
                id: o.Measuring_station_ID,
                //Stationlocation: o.Station_location,
                //"vessel id": id
            }
        });
    },

    async fetchAllNodes() {
        return await requestMetaData(`${dataApiUrl}/meta/station/all`, ["id", "Measuring_station_ID", "internal_id"], (o) => { //, "station", ["Measuring_station_ID", "Station_location"], 
            return {
                id: o.Measuring_station_ID,
        //        location: o.Station_location
            }
        });
    },

    async fetchAllSensors() {
        return await requestMetaData(`${dataApiUrl}/meta/sensor/all`, ['Sensor_ID', "id"], (o) => {
            return {
                id: o.Sensor_ID
            }
        });
    },

    async fetchSensors(stationId : string) {
        return await requestMetaData(`${dataApiUrl}/meta/vms?station_id=${stationId}`, ['Sensor_ID', "id"], (o) => { //, "sensor", ['Sensor_ID', 'Sensor_location', 'Sensor_type', 'Sensor_unit', 'Measuring_station_ID'], 
            return {
                id: o.Sensor_ID
            //    location: o.Sensor_location,
            //    type: o.Sensor_type,
            //    "node id": o.Measuring_station_ID,
            //    unit: o.Sensor_unit || 'unbekannt'
            }
        });
    },

    async fetchSensorData(sensorTypes : string[], nodeID : string) : Promise<{ [key: string]: SensorData }> {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken?.toString();
            const sensorData: { [key: string]: SensorData } = {};

            for(const sensorType of sensorTypes) {
                if(sensorType == "fill")
                    continue;
                const res = await axios.get(`${dataApiUrl}/data/now`, {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        'node-id': nodeID,
                        'type': sensorType
                    },
                    timeout: 10000
                });

                const rawData = res.data?.data;
                const latestEntry = rawData ? rawData[rawData.length - 1] : null;
                const lastSeen = latestEntry?.timestamp;
                sensorData[sensorType] = {
                    lastSeen: lastSeen,
                    lastValue: latestEntry,
                    data: rawData
                }
            }
            console.log(sensorData);
            return sensorData;
        } catch (ex) {
            console.error(`Loading of sensor data on node ${nodeID} failed: `, ex);
        }
        return {};
    },

    async fetchHistoricSensorData(sensorTypes : string[], nodeID : string, timeframe : string) : Promise<{ [key: string]: SensorData }> {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken?.toString();
            const sensorData: { [key: string]: SensorData } = {};

            for(const sensorType of sensorTypes) {
                if(sensorType == "fill")
                    continue;
                
                const res = await axios.get(`${dataApiUrl}/data/aggregate`, {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                        'Content-Type': 'application/json'
                    },
                    params: {
                        'node-id': nodeID,
                        'type': sensorType,
                        'timeframe': timeframe
                    },
                    timeout: 20000
                });

                const rawData = res.data?.data.map((entry : {hydronode: string, day: number, month: number, year: number, value: number}) => {
                    return {
                        timestamp:new Date(entry.year, entry.month - 1, entry.day).getTime(),
                        value: entry.value
                    }
                });
                const latestEntry = rawData ? rawData[rawData.length - 1] : null;
                const lastSeen = latestEntry?.timestamp;
                sensorData[sensorType] = {
                    lastSeen: lastSeen,
                    lastValue: latestEntry,
                    data: rawData
                }
            }
            console.log(sensorData);
            return sensorData;
        } catch (ex) {
            console.error(`Loading of sensor data on node ${nodeID} failed: `, ex);
        }
        return {};
    },

    async fetchSchema(resourceType : string) : Promise<InputSchema[]> {
        try {
            const res = await getRequest(`${dataApiUrl}/meta/schema`, {resource_type: resourceType});

            if(!res)
                return [];
            console.log('Fetched schema:', res.data)

            const fields = res.data.schema.fields as InputSchema[];
            return fields;
        } catch (ex) {
            console.error('Error loading Schemas:', ex);
            return [];
        }
    },

    async saveMeta(resource : string, id : string | number, data : {[key : string] : string | null}) {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken?.toString();

            if(!idToken){
                console.error("User isn't authenticated");
                return false;
            }

            await axios.put(`${dataApiUrl}/admin/meta/${resource}/${id}`, data, {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            })
            return true;
        } catch (err) {
            console.error('Error saving meta data:', err);
            return false;
        } 
    },

    async createResource(resourceType : string, body : any) {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken?.toString();

            if(!idToken){
                console.error("User isn't authenticated");
                return false;
            }

            const response = await axios.post(`${dataApiUrl}/admin/meta/${resourceType}`, body, {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
            });
            console.log("Saved data: ", response.data);
            return true;
        } catch (err) {
            console.error(`Saving of meta data on endpoint ${dataApiUrl}/admin/meta/${resourceType} failed:`, err)
            return false;
        }
    },

    async deleteResource(type: string, id: string | number) {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if(!idToken){
            console.error("User isn't authenticated");
            return false;
        }

        const result = await axios.delete(`${dataApiUrl}/admin/meta/${type}/${id}`, {
            headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
        })
        return result;
    },
    
    async sendCommand(id : string, key : string, payload : any) {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if(!idToken){
            console.error("User isn't authenticated");
            return false;
        }

        const command = { 
            command: {
                type: "REQUEST",
                key: key,
                payload: payload
            }
        };

        const result = await axios.post(`${dataApiUrl}/admin/command`, command, {
            headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
        })
        return result;
    },

    async fetchUsers() {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if(!idToken){
            console.error("User isn't authenticated");
            return false;
        }

        const res = await axios.get(`${dataApiUrl}/admin/users`, {
            headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
        })
        return res.data;
    },

    async addUser(email : string) {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if(!idToken){
            console.error("User isn't authenticated");
            return false;
        }

        return await axios.post(`${dataApiUrl}/admin/users`, {email: email}, {
            headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
        })
    },

    async removeUser(email : string) {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if(!idToken){
            console.error("User isn't authenticated");
            return false;
        }

        await axios.delete(`${dataApiUrl}/admin/users/${email}`, {
            headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
        })
    }
}

async function getRequest(endpoint : string, params : {[key : string]: string} = {}, timeout : number = 5000) {
    try {
        const session = await fetchAuthSession();
        const idToken = session.tokens?.idToken?.toString();

        if(!idToken){
            console.error("User isn't authenticated");
            return null;
        }

        return await axios.get(endpoint, {
            headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            },
            params: params,
            timeout: timeout
        });
    } catch (err) {
        console.error(`Loading of meta data on endpoint ${endpoint} failed:`, err)
        return null;
    }
}

async function requestMetaData(endpoint : string, exKeys : string[], fn: (elem : any) => MetaData){ //, replaceStr : string, ) {
    try {
        const res = await getRequest(endpoint);
        console.log("Requested Meta Data on " + endpoint + " got: ", res);

        if(!res)
            return [];
        
        const list = res.data.data.map((o : any) => {
            const element : MetaData = fn(o);

            for (const [key, value] of Object.entries(o)) {
                if (!exKeys.includes(key)) {
                    const normalizedKey = key;
                    element[normalizedKey] = value
                }
            }

            return element;
        });
        
        return list;
    } catch (err) {
        console.error(`Loading of meta data on endpoint ${endpoint} failed:`, err)
        return [];
    }
}