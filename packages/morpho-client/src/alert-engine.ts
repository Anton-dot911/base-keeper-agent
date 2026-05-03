export function isExecutionReady(signal: any, config: any): boolean {
  return (
    signal.simulation.profitable &&
    signal.simulation.netProfitUsd >= config.MIN_EXECUTION_NET_PROFIT_USD &&
    signal.simulation.confidence === config.MIN_EXECUTION_CONFIDENCE
  );
}

export async function sendEmailAlert(signal: any, config: any) {
  if (!config.ALERT_EMAIL_ENABLED || !config.RESEND_API_KEY) return;

  const body = {
    from: config.ALERT_EMAIL_FROM,
    to: [config.ALERT_EMAIL_TO],
    subject: "🔥 Liquidation Opportunity Detected",
    html: `
      <h2>Base Keeper Agent Alert</h2>
      <p><b>Market:</b> ${signal.marketId}</p>
      <p><b>User:</b> ${signal.userAddress}</p>
      <p><b>Health Factor:</b> ${signal.healthFactor}</p>
      <p><b>Net Profit:</b> $${signal.simulation.netProfitUsd.toFixed(2)}</p>
      <p><b>Confidence:</b> ${signal.simulation.confidence}</p>
    `
  };

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}
