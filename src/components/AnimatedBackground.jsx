import { useThemeMode } from "../context/ThemeContext";
import { COLORS }       from "../brand/theme";

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
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(40px,-60px) scale(1.12); }
          66% { transform: translate(-30px,30px) scale(0.92); }
        }
        @keyframes blob2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(-50px,40px) scale(1.08); }
          66% { transform: translate(40px,-20px) scale(0.95); }
        }
        @keyframes blob3 {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(30px,50px) scale(0.92); }
          66% { transform: translate(-40px,-30px) scale(1.08); }
        }
        @keyframes blob4 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%  { transform: translate(-30px,-40px) scale(1.06); }
        }
        @keyframes gridFade {
          0%,100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .ft-blob {
          position: absolute; border-radius: 50%;
          filter: blur(80px);
          opacity: ${dark ? 0.14 : 0.18};
        }
        .ft-b1 { animation: blob1 16s ease-in-out infinite; }
        .ft-b2 { animation: blob2 20s ease-in-out infinite; }
        .ft-b3 { animation: blob3 18s ease-in-out infinite; }
        .ft-b4 { animation: blob4 22s ease-in-out infinite; }
      `}</style>

      {/* Base */}
      <div style={{
        position: "absolute", inset: 0,
        background: dark
          ? `linear-gradient(135deg, ${COLORS.ink} 0%, #130F0A 100%)`
          : `linear-gradient(135deg, ${COLORS.paper} 0%, ${COLORS.cream} 100%)`,
      }} />

      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `
          linear-gradient(${dark ? "rgba(247,243,237,0.025)" : "rgba(15,14,12,0.04)"} 1px, transparent 1px),
          linear-gradient(90deg, ${dark ? "rgba(247,243,237,0.025)" : "rgba(15,14,12,0.04)"} 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }} />

      {/* Saffron blob — top left */}
      <div className="ft-blob ft-b1" style={{
        width: 650, height: 650,
        top: "-200px", left: "-150px",
        background: `radial-gradient(circle, ${COLORS.saffron} 0%, transparent 70%)`,
      }} />

      {/* Green blob — bottom right */}
      <div className="ft-blob ft-b2" style={{
        width: 550, height: 550,
        bottom: "-150px", right: "-100px",
        background: `radial-gradient(circle, ${COLORS.green} 0%, transparent 70%)`,
      }} />

      {/* Navy blob — center right */}
      <div className="ft-blob ft-b3" style={{
        width: 400, height: 400,
        top: "40%", right: "10%",
        background: `radial-gradient(circle, ${COLORS.navy} 0%, transparent 70%)`,
      }} />

      {/* Rust blob — bottom left */}
      <div className="ft-blob ft-b4" style={{
        width: 350, height: 350,
        bottom: "5%", left: "20%",
        background: `radial-gradient(circle, ${COLORS.rust} 0%, transparent 70%)`,
      }} />
    </div>
  );
}