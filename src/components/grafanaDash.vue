<template>
  <div class="grafana-chart">
    <button @click="fetchData" class="btn">Daten laden</button>
    <Line v-if="chartData" :data="chartData" :options="chartOptions" />
    <p v-if="error" class="error">Fehler: {{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);

const chartData = ref(null);
const error = ref(null);

const fetchData = async () => {
  error.value = null;
  try {
    const response = await axios.post(
        'https://vbclidusggj55uwwkpk3we22f40nilmp.lambda-url.eu-central-1.on.aws/grafana/api/ds/query',
        {
          queries: [
            {
              database: '"distanceTimestreamDB"',
              datasource: {
                type: 'grafana-timestream-datasource',
                uid: 'aehli3wxgge80c',
              },
              format: 0,
              measure: '',
              rawQuery: `
              SELECT time, measure_value::bigint as distance
              FROM "distanceTimestreamDB"."distanceTimestreamDBTable"
              WHERE measure_name = 'distance'
              ORDER BY time DESC
              LIMIT 100
            `,
              refId: 'A',
              table: '"distanceTimestreamDBTable"',
              datasourceId: 1,
              intervalMs: 30000,
              maxDataPoints: 819,
            },
          ],
          from: `${Date.now() - 1000 * 60 * 60}`, // 1h ago
          to: `${Date.now()}`,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
    );

    const result = response.data?.results?.A?.frames?.[0]?.data;

    if (!result?.fields) throw new Error('Keine Daten empfangen');

    const timeField = result.fields.find((f) => f.name === 'time');
    const distanceField = result.fields.find((f) => f.name === 'distance');

    const labels = timeField.values.map((ts) => new Date(ts).toLocaleTimeString());
    const values = distanceField.values;

    chartData.value = {
      labels,
      datasets: [
        {
          label: 'Entfernung (cm)',
          data: values,
          fill: false,
          tension: 0.1,
          borderColor: '#42A5F5',
          pointRadius: 2,
        },
      ],
    };
  } catch (err) {
    error.value = err.message;
    console.error('🚨 Fehler bei Anfrage:', err);
  }
};

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: true },
    title: {
      display: true,
      text: 'Live-Daten: Entfernung',
    },
  },
  scales: {
    x: { title: { display: true, text: 'Zeit' } },
    y: { title: { display: true, text: 'Entfernung (cm)' } },
  },
};
</script>

<style scoped>
.grafana-chart {
  max-width: 800px;
  margin: auto;
  padding: 1rem;
}
.btn {
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
}
.error {
  color: red;
  margin-top: 1rem;
}
</style>
