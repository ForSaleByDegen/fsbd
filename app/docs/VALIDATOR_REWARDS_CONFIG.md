# Validator Rewards Configuration

Token distribution to validators is configurable and can be slowed down over time via decay.

## Platform Config Key

`validator_rewards_config` in `platform_config` table.

## Schema

```json
{
  "enabled": false,
  "base_reward_per_job": 10,
  "decay_period_days": 30,
  "decay_percent": 5,
  "start_date": null,
  "min_reward_per_job": 1
}
```

| Field | Description |
|-------|-------------|
| `enabled` | Turn rewards on/off |
| `base_reward_per_job` | $FSBD paid per completed job (at start) |
| `decay_period_days` | After each period, reward is reduced |
| `decay_percent` | % reduction per period (e.g. 5 = 5% less each period) |
| `start_date` | ISO date when decay starts (null = now) |
| `min_reward_per_job` | Floor — reward never goes below this |

## Adjusting Distribution

- **Slow down**: Increase `decay_percent` or decrease `decay_period_days`
- **Reduce base**: Lower `base_reward_per_job`
- **Pause**: Set `enabled` to `false`

## Example

- Base 10 $FSBD/job, 5% decay every 30 days
- Day 0: 10 $FSBD
- Day 30: 9.5 $FSBD
- Day 60: 9.025 $FSBD
- ...approaches `min_reward_per_job` over time

Update via Supabase SQL or an admin API.

## Ledger and Payouts

When rewards are enabled and a validator completes a job, the reward is recorded in `validator_rewards_ledger` (status `pending`). The `total_earned` shown in the validators UI is the sum of all ledger entries for that wallet. Actual on-chain $FSBD transfers require a payout process (similar to lister-airdrop) using `VALIDATOR_REWARDS_KEYPAIR_BASE64` — not yet implemented.
