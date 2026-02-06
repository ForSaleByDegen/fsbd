/**
 * Insurance cost calculation for escrow buyer protection.
 * Fee = 5% of sale. Coverage cap = max reimbursement per claim (from platform config).
 */

export interface InsuranceConfig {
  protection_coverage_cap_usd: number
  sol_usd_rate: number
}

export interface InsuranceCostResult {
  feeSol: number
  feeUsd: number
  coverageCapUsd: number
}

/**
 * Compute insurance fee (5% of sale) and coverage cap for display.
 * @param saleAmount - Sale amount in native units (SOL or token)
 * @param priceToken - 'SOL' or token symbol
 * @param config - Platform config with coverage_cap_usd and sol_usd_rate
 */
export function getInsuranceCost(
  saleAmount: number,
  priceToken: string,
  config: InsuranceConfig
): InsuranceCostResult {
  const coverageCapUsd = config.protection_coverage_cap_usd ?? 100
  const solUsdRate = config.sol_usd_rate ?? 200

  let feeUsd: number
  if (priceToken === 'SOL' || !priceToken) {
    const saleUsd = saleAmount * solUsdRate
    feeUsd = saleUsd * 0.05
  } else {
    // For tokens, assume saleAmount is in token units; use solUsdRate as rough conversion if needed
    // Or pass saleAmountUsd directly - for now treat as SOL equivalent for display
    feeUsd = saleAmount * solUsdRate * 0.05
  }

  const feeSol = feeUsd / solUsdRate

  return {
    feeSol,
    feeUsd,
    coverageCapUsd,
  }
}
