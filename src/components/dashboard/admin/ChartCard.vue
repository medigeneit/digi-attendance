<template>
  <section class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <h3 class="text-base font-bold text-slate-900">{{ title }}</h3>
        <p v-if="subtitle" class="mt-1 text-xs text-slate-500">{{ subtitle }}</p>
      </div>
      <slot name="action" />
    </div>

    <EmptyState
      v-if="!hasData"
      :title="emptyTitle"
      message="Filters returned no chartable values."
      icon="far fa-chart-bar"
    />
    <VueApexCharts
      v-else
      :type="type"
      :height="height"
      :options="chartOptions"
      :series="safeSeries"
    />
  </section>
</template>

<script setup>
import VueApexCharts from 'vue3-apexcharts'
import { computed } from 'vue'
import EmptyState from './EmptyState.vue'

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'area',
  },
  categories: {
    type: Array,
    default: () => [],
  },
  labels: {
    type: Array,
    default: () => [],
  },
  series: {
    type: Array,
    default: () => [],
  },
  colors: {
    type: Array,
    default: () => ['#22c55e', '#ef4444', '#f97316', '#8b5cf6', '#2563eb'],
  },
  height: {
    type: Number,
    default: 320,
  },
  emptyTitle: {
    type: String,
    default: 'No chart data',
  },
})

const numericValues = computed(() => {
  if (props.type === 'donut') return props.series.map((value) => Number(value) || 0)
  return props.series.flatMap((item) => (Array.isArray(item?.data) ? item.data : [])).map((value) => Number(value) || 0)
})

const hasData = computed(() => numericValues.value.some((value) => value > 0))
const safeSeries = computed(() => {
  if (props.type === 'donut') return props.series.map((value) => Number(value) || 0)
  return props.series.map((item) => ({
    name: item?.name || 'Series',
    data: Array.isArray(item?.data) ? item.data.map((value) => Number(value) || 0) : [],
  }))
})

const chartOptions = computed(() => {
  const base = {
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    },
    colors: props.colors,
    dataLabels: { enabled: false },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      fontSize: '12px',
      markers: { radius: 8 },
    },
    grid: {
      borderColor: '#e2e8f0',
      strokeDashArray: 4,
    },
    responsive: [
      {
        breakpoint: 768,
        options: {
          chart: { height: 260 },
          legend: { position: 'bottom' },
        },
      },
    ],
  }

  if (props.type === 'donut') {
    return {
      ...base,
      labels: props.labels,
      plotOptions: {
        pie: {
          donut: {
            size: '68%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Leaves',
              },
            },
          },
        },
      },
    }
  }

  return {
    ...base,
    stroke: {
      curve: 'smooth',
      width: props.type === 'bar' ? 0 : 3,
    },
    fill: props.type === 'area'
      ? {
          type: 'gradient',
          gradient: {
            shadeIntensity: 0.4,
            opacityFrom: 0.35,
            opacityTo: 0.05,
          },
        }
      : { opacity: 0.9 },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '42%',
      },
    },
    xaxis: {
      categories: props.categories,
      labels: {
        style: { colors: '#64748b', fontSize: '12px' },
      },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: {
        style: { colors: '#64748b', fontSize: '12px' },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
    },
  }
})
</script>
