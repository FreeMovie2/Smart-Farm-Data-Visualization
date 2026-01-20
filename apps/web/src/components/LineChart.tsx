'use client';

import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';

type Point = { ts: string; value: number | null };

export function LineChart({ title, points }: { title: string; points: Point[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current = echarts.init(containerRef.current);
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption({
      color: ['#1f7a55'],
      title: { text: title, left: 'center', textStyle: { fontSize: 11 } },
      grid: { left: 44, right: 16, top: 26, bottom: 26 },
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: 'rgba(19, 23, 20, 0.28)' } },
        axisLabel: { fontSize: 10, color: 'rgba(19, 23, 20, 0.62)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(19, 23, 20, 0.06)' } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { lineStyle: { color: 'rgba(19, 23, 20, 0.28)' } },
        axisLabel: { fontSize: 10, color: 'rgba(19, 23, 20, 0.62)' },
        splitLine: { show: true, lineStyle: { color: 'rgba(19, 23, 20, 0.08)' } },
      },
      series: [
        {
          type: 'line',
          showSymbol: false,
          smooth: true,
          lineStyle: { width: 2 },
          data: points.filter((p) => p.value !== null).map((p) => [p.ts, p.value]),
        },
      ],
      tooltip: { trigger: 'axis' },
    });
  }, [points, title]);

  return <div ref={containerRef} className="chart-card" />;
}

