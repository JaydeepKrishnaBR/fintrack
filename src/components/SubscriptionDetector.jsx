import { Box, Typography, Chip, Divider } from "@mui/material";
import { detectSubscriptions } from "../utils/insightEngine";

export default function SubscriptionDetector({ transactions, dark }) {
  const subs = detectSubscriptions(transactions);
  const total = subs.reduce((s, sub) => s + sub.amount, 0);
  const fmt = n => "₹" + Number(n).toLocaleString("en-IN");

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography sx={{
          fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 0.8, color: dark ? "rgba(255,255,255,0.4)" : "#aaa",
        }}>
          Subscription Leaks
        </Typography>
        {subs.length > 0 && (
          <Chip
            label={`${fmt(total)}/mo · ${fmt(total * 12)}/yr`}
            size="small"
            sx={{ bgcolor: "rgba(226,75,74,0.12)", color: "#E24B4A", fontWeight: 700, fontSize: 11 }}
          />
        )}
      </Box>

      {subs.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: dark ? "rgba(255,255,255,0.35)" : "#bbb" }}>
          No recurring subscriptions detected yet. Import 2+ months of statements to detect patterns.
        </Typography>
      ) : (
        <Box>
          <Typography sx={{ fontSize: 12, color: dark ? "rgba(255,255,255,0.4)" : "#888", mb: 1.5 }}>
            Found {subs.length} recurring charges — review if all are still needed.
          </Typography>
          {subs.map((sub, i) => (
            <Box key={i}>
              {i > 0 && <Divider sx={{ opacity: 0.06, my: 1 }} />}
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }} noWrap>
                    {sub.merchant}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.35)" : "#aaa" }}>
                    Seen {sub.months} months · Last: {sub.lastCharged}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#E24B4A" }}>
                    {fmt(sub.amount)}/mo
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: dark ? "rgba(255,255,255,0.35)" : "#aaa" }}>
                    {fmt(sub.annual)}/yr
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}