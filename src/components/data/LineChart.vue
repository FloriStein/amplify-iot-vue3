<script setup lang="ts">
    import { Line } from 'vue-chartjs'
    import {
        Chart as ChartJS,
        Title,
        Tooltip,
        Legend,
        LineElement,
        PointElement,
        CategoryScale,
        LinearScale
    } from 'chart.js'
    import { computed, onMounted, ref } from 'vue';
    import 'chartjs-adapter-date-fns';

    ChartJS.register(Title, Tooltip, Legend, LineElement, PointElement, CategoryScale, LinearScale)

    const props = withDefaults(
        defineProps<{ 
            data : {timestamp : number, value : number}[],
            metric : string,
            unit : string, 
            title? : string,
            unitShort? : string
        }>(),
        {
            title: "",
            unitShort: "",
        }
    );

    function hexToRgba(hex: string, alpha: number): string {
        hex = hex.replace('#', '');

        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    //TODO Fix colors
    const primaryColor = ref('#3b82f6');
    const primaryHoverColor = ref('#3b82f6');
    const textColor = ref('#ffffff');

    onMounted(() => {
    const styles = getComputedStyle(document.documentElement);
    primaryColor.value = styles.getPropertyValue('--primary').trim() || '#3b82f6';
    primaryHoverColor.value = hexToRgba(styles.getPropertyValue('--primary-hover').trim() || '#3b82f6', 0.25);
    textColor.value = styles.getPropertyValue('--card-foreground').trim() || '#ffffff';
    });

    const filtered = computed(() =>
        props.data.filter(d => d.value >= 0)
    )

    const labels = computed(() =>
        filtered.value.map(d => d.timestamp)
    )

    const values = computed(() =>
        filtered.value.map(d => d.value)
    )

    const chartData = computed(() => ({
        labels: labels.value,
        datasets: [
            {
            label: `${props.metric} (${props.unit})`,
            data: values.value,
            backgroundColor: primaryHoverColor.value,
            borderColor: primaryColor.value,
            fill: true,
            tension: 0.3, 
            }
        ]
    }));

    const chartOptions = computed(() => ({
        responsive: true,
        plugins: {
            legend: {
                labels: {
                    color: textColor.value
                },
                display: true
            },
            tooltip: { enabled: true },
            title: {
                display: true,
                text: props.title,
                font: {
                    size: 18
                },
                color: textColor.value
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'hour',
                    displayFormats: {
                        hour: 'HH:mm dd.MM.yy'
                    }
                },
                title: {
                    display: true,
                    text: 'Time',
                    color: textColor.value
                },
                ticks: {
                    color: textColor.value
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: props.unitShort
                },
                ticks: {
                    color: textColor.value
                }
            }
        }
    }))
</script>

<template>
    <div class="text-foreground bg-card border border-border rounded w-full h-fit rounded-lg p-4 ">
        <Line :data="chartData" :options="chartOptions"/>
    </div>
</template>