"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrDisplay({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 256,
      margin: 2,
      color: { dark: "#1e3a8a", light: "#ffffff" },
    });
  }, [url]);

  return (
    <div className="flex justify-center">
      <div className="p-4 bg-white rounded-xl border-2 border-blue-100 shadow-inner">
        <canvas ref={canvasRef} className="rounded-lg" />
      </div>
    </div>
  );
}
