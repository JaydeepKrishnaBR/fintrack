import { Box, Typography, Card } from "@mui/material";

const COLORS = {
  danger:  { bg: "rgba(226,75,74,0.1)",   border: "rgba(226,75,74,0.3)",   text: "#E24B4A" },
  warning: { bg: "rgba(186,117,23,0.1)",  border: "rgba(186,117,23,0.3)",  text: "#BA7517" },
  success: { bg: "rgba(29,158,117,0.1)",  border: "rgba(29,158,117,0.3)",  text: "#1D9E75" },
  info:    { bg: "rgba(55,138,221,0.1)",  border: "rgba(55,138,221,0.3)",  text: "#378ADD" },
};

export default function InsightCards({ insights, dark }) {
  if (!insights || insights.length === 0) return null;

  return (
    <Box>
      <Typography sx={{
        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: 0.8, color: dark ? "rgba(255,255,255,0.4)" : "#aaa", mb: 1.5,
      }}>
        Insights
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {insights.slice(0, 4).map((ins, i) => {
          const c = COLORS[ins.type] || COLORS.info;
          return (
            <Box key={i} sx={{
              p: 1.5, borderRadius: 2.5,
              background: c.bg,
              border: `1px solid ${c.border}`,
              display: "flex", gap: 1.5, alignItems: "flex-start",
            }}>
              <Typography sx={{ fontSize: 18, lineHeight: 1.2, mt: "1px" }}>{ins.icon}</Typography>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: c.text, mb: 0.3 }}>
                  {ins.title}
                </Typography>
                <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.6)" : "#555", lineHeight: 1.5 }}>
                  {ins.message}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}