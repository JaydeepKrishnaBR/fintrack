import { useEffect, useRef } from "react";
import { useThemeMode } from "../context/ThemeContext";

export default function AnimatedBackground() {
  const { resolved } = useThemeMode();
  const dark = resolved === "dark";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 0,
      overflow: "hidden", pointerEvents: "none",
    }}>
      <style>{`
        @keyframes blob1 {
          0%,100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.15); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        @keyframes blob2 {
          0%,100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(-50px, 40px) scale(1.1); }
          66% { transform: translate(40px, -20px) scale(0.95); }
        }
        @keyframes blob3 {
          0%,100% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, 50px) scale(0.9); }
          66% { transform: translate(-40px, -30px) scale(1.1); }
        }
        @keyframes blob4 {
          0%,100% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(-30px, -40px) scale(1.05); }
        }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(72px);
          opacity: ${dark ? 0.18 : 0.22};
        }
        .blob1 { animation: blob1 14s ease-in-out infinite; }
        .blob2 { animation: blob2 18s ease-in-out infinite; }
        .blob3 { animation: blob3 16s ease-in-out infinite; }
        .blob4 { animation: blob4 20s ease-in-out infinite; }
      `}</style>

      {/* Base gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: dark
          ? "linear-gradient(135deg, #0a0f1a 0%, #0d1520 40%, #0f1117 100%)"
          : "linear-gradient(135deg, #e8f5f0 0%, #f0f7ff 50%, #f5f0ff 100%)",
      }} />

      {/* Blob 1 — teal/green */}
      <div className="blob blob1" style={{
        width: 600, height: 600,
        top: "-150px", left: "-100px",
        background: dark
          ? "radial-gradient(circle, #1D9E75 0%, transparent 70%)"
          : "radial-gradient(circle, #1D9E75 0%, transparent 70%)",
      }} />

      {/* Blob 2 — blue */}
      <div className="blob blob2" style={{
        width: 500, height: 500,
        top: "30%", right: "-100px",
        background: dark
          ? "radial-gradient(circle, #1a3a6e 0%, transparent 70%)"
          : "radial-gradient(circle, #378ADD 0%, transparent 70%)",
      }} />

      {/* Blob 3 — amber/orange */}
      <div className="blob blob3" style={{
        width: 450, height: 450,
        bottom: "-100px", left: "30%",
        background: dark
          ? "radial-gradient(circle, #5a3500 0%, transparent 70%)"
          : "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
      }} />

      {/* Blob 4 — purple */}
      <div className="blob blob4" style={{
        width: 350, height: 350,
        bottom: "10%", right: "20%",
        background: dark
          ? "radial-gradient(circle, #2d1b69 0%, transparent 70%)"
          : "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
      }} />

      {/* Noise texture overlay */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity: dark ? 0.4 : 0.3,
      }} />
    </div>
  );
}