"use client";

import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

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
  const doughnutData = {
    labels: ["账号记录", "特别收藏", "订阅总数", "即将到期"],
    datasets: [
      {
        data: [totalItems, totalFavorites, totalSubscriptions, dueSubscriptions],
        backgroundColor: ["#5e6ad2", "#f97316", "#10b981", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const trendData = {
    labels: ["记录", "收藏", "订阅", "到期提醒"],
    datasets: [
      {
        data: [totalItems, totalFavorites, totalSubscriptions, dueSubscriptions],
        borderColor: "#5e6ad2",
        backgroundColor: "rgba(94,106,210,0.14)",
        fill: true,
        tension: 0.36,
        pointRadius: 3,
        pointHoverRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#14171f",
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#6b7280",
          font: { size: 11 },
        },
      },
      y: {
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
    },
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div className="rounded-[22px] border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="h-[180px]">
          <Doughnut
            data={doughnutData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: "68%",
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: "#14171f",
                },
              },
            }}
          />
        </div>
      </div>

      <div className="rounded-[22px] border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="mb-3 text-sm font-medium text-gray-900 dark:text-textPrimary">数据概览趋势</div>
        <div className="h-[180px]">
          <Line data={trendData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
