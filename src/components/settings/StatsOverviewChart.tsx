"use client";

import { useState } from "react";
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
  const segments = [
    { label: "账号记录", value: totalItems, color: "#5e6ad2", hint: "库内全部账号与凭据记录" },
    { label: "特别收藏", value: totalFavorites, color: "#f97316", hint: "你手动标星的重点账号" },
    { label: "订阅总数", value: totalSubscriptions, color: "#10b981", hint: "当前录入的全部订阅项目" },
    { label: "即将到期", value: dueSubscriptions, color: "#ef4444", hint: "7 天内会进入提醒窗口的订阅" },
  ];
  const [activeIndex, setActiveIndex] = useState(0);

  const doughnutData = {
    labels: segments.map((segment) => segment.label),
    datasets: [
      {
        data: segments.map((segment) => segment.value),
        backgroundColor: segments.map((segment) => segment.color),
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
              onClick: (_, elements) => {
                if (elements.length > 0) {
                  setActiveIndex(elements[0].index);
                }
              },
            }}
          />
        </div>
        <div className="mt-4 rounded-2xl bg-slate-50/80 px-4 py-3 text-center dark:bg-white/5">
          <div className="text-[12px] text-gray-500 dark:text-textSecondary">{segments[activeIndex].label}</div>
          <div className="mt-1 text-[26px] font-semibold text-gray-900 dark:text-textPrimary">{segments[activeIndex].value}</div>
          <div className="mt-1 text-[11px] text-gray-500 dark:text-textTertiary">{segments[activeIndex].hint}</div>
        </div>
      </div>

      <div className="rounded-[22px] border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <div className="mb-3 text-sm font-medium text-gray-900 dark:text-textPrimary">数据概览趋势</div>
        <div className="h-[180px]">
          <Line data={trendData} options={chartOptions} />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {segments.map((segment, index) => (
            <button
              key={segment.label}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`rounded-2xl border px-3 py-2 text-left transition ${
                activeIndex === index
                  ? "border-brandIndigo/40 bg-brandIndigo/8"
                  : "border-transparent bg-slate-50/70 hover:border-slate-200 dark:bg-white/5 dark:hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                <span className="text-xs font-medium text-gray-800 dark:text-textPrimary">{segment.label}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500 dark:text-textSecondary">{segment.hint}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
