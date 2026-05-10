"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  type ChartOptions,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

type StatsOverviewChartProps = {
  totalItems: number;
  totalFavorites: number;
  totalSubscriptions: number;
  dueSubscriptions: number;
};

export function StatsOverviewChart({
  totalItems,
  totalFavorites,
  totalSubscriptions,
  dueSubscriptions,
}: StatsOverviewChartProps) {
  const segments = [
    { label: "账号记录", value: totalItems, color: "#5e6ad2", hint: "库内全部账号与凭据记录" },
    { label: "特别收藏", value: totalFavorites, color: "#f97316", hint: "你手动标星的重点账号" },
    { label: "订阅总数", value: totalSubscriptions, color: "#10b981", hint: "当前录入的全部订阅项目" },
    { label: "即将到期", value: dueSubscriptions, color: "#ef4444", hint: "7 天内会进入提醒窗口的订阅" },
  ];

  const chartData = {
    labels: segments.map((segment) => segment.label),
    datasets: [
      {
        data: segments.map((segment) => segment.value),
        backgroundColor: segments.map((segment) => segment.color),
        borderRadius: 10,
        borderSkipped: false,
        barThickness: 18,
      },
    ],
  };

  const chartOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#14171f",
        displayColors: false,
        callbacks: {
          label: (context) => {
            const segment = segments[context.dataIndex];
            return `${segment.label}：${context.parsed.x ?? 0}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: "rgba(148,163,184,0.14)",
        },
        ticks: {
          precision: 0 as const,
          color: "#94a3b8",
          font: { size: 11 },
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#6b7280",
          font: { size: 11 },
        },
      },
    },
  };

  return (
    <div className="rounded-xl border border-white/70 bg-gradient-to-br from-white/90 via-white/80 to-violet-50/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:from-white/10 dark:via-white/5 dark:to-violet-500/10">
      <div>
        <div className="mb-3 text-sm font-medium text-gray-900 dark:text-textPrimary">数据总览</div>
        <div className="h-[220px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
