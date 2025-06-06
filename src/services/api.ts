import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth'

const dataApiUrl = 'https://fxxok2wf3d.execute-api.eu-central-1.amazonaws.com/dev';

type Vessel = {
  id: any;
  location: any;
  [key: string]: any;
};

export default {
    async fetchVessels() {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken?.toString();

            const res = await axios.get(`${dataApiUrl}/meta/vessels`, {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // Normalisiere Vessel-Daten
            const vessels = res.data.data.map(v => {
                const vesselObj : Vessel = {
                    "id": v.Vessel_ID,
                    "location": v.Vessel_location
                }

                const excludedKeys = ["Vessel_ID", "Vessel_location"]
                for (const [key, value] of Object.entries(v)) {
                    if (!excludedKeys.includes(key)) {
                    const normalizedKey = key.toLowerCase()
                    vesselObj[normalizedKey] = value ?? 'unbekannt'
                    }
                }

                return vesselObj;
            });
            return vessels;
        } catch (err) {
            console.error('Loading of Vessels failed:', err)
            return [];
        }
    }
    
    /*
    async fetchStations(vesselId : number) {
        const session = await fetchAuthSession()
        const idToken = session.tokens?.idToken?.toString()

        try {
            const res = await axios.get(`${dataApiUrl}/meta/vessels?vessel_id=${vesselId}`, {
            headers: {
                Authorization: `Bearer ${idToken}`,
                'Content-Type': 'application/json'
            }
            })

            stations.value = res.data.data.map(station => {
            const stationObj = {
                id: station.Measuring_station_ID,
                name: station.Measuring_station_ID,
                vessel_id: vesselId
            }

            const excludedKeys = ['Measuring_station_ID', 'Vessel_ID']
            for (const [key, value] of Object.entries(station)) {
                if (!excludedKeys.includes(key)) {
                const normalizedKey = key.toLowerCase()
                stationObj[normalizedKey] = value ?? 'unbekannt'
                }
            }

            return stationObj
            })

            if (stations.value.length > 0) {
            selectedStation.value = stations.value[0].id
            await fetchSensors(selectedStation.value)
            }

        } catch (err) {
            console.error('❌ Fehler beim Laden der Messstationen:', err)
        }
    }
    */
}