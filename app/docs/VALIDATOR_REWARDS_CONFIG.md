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
  "min_reward_per_job": 1,
  "primary_reward_share": 0.75,
  "verifier_reward_share": 0.25,
  "lottery_interval": 10,
  "lottery_bonus_multiplier": 2
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
| `primary_reward_share` | Share of base reward for the primary validator (0–1, default 0.75) |
| `verifier_reward_share` | Share for verifiers who confirm primary results (0–1, default 0.25) |
| `lottery_interval` | Every N completed jobs, a random validator gets a bonus (default 10) |
| `lottery_bonus_multiplier` | Lottery winner gets base × this (default 2) |

## Tiered Rewards

When a browser validator completes a job, they receive `primary_reward_share` of the base reward. Other validators can claim verification jobs to confirm the result; each verifier who submits match/mismatch receives `verifier_reward_share` of the base reward. Every `lottery_interval` completed jobs, a random active validator receives a lottery bonus (`base × lottery_bonus_multiplier`). Configure via Admin → Validators → "Tiered rewards (primary / verifier / lottery)".

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
