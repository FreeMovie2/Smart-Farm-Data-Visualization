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
      title: { text: title, left: 'center', textStyle: { fontSize: 12 } },
      grid: { left: 40, right: 20, top: 30, bottom: 30 },
      xAxis: { type: 'time' },
      yAxis: { type: 'value', scale: true },
      series: [
        {
          type: 'line',
          showSymbol: false,
          data: points.filter((p) => p.value !== null).map((p) => [p.ts, p.value]),
        },
      ],
      tooltip: { trigger: 'axis' },
    });
  }, [points, title]);

  return <div ref={containerRef} style={{ height: 280, width: '100%', border: '1px solid #eee', borderRadius: 8 }} />;
}

