-- Reward history backfilled from Nimiq Watch, for stakers whose validator is
-- not ours. Applied by hand; the app's `pool` user has no CREATE.
--
--   ssh <host> 'mysql --defaults-file=/etc/mysql/debian.cnf' < server/sql/portfolio-rewards.sql
--
-- Deliberately separate from pool.staker_rewards. That table is ours and
-- authoritative, recorded as we pay; this one is a third party's view of the
-- chain, and mixing them would make it impossible to tell which is which when
-- they disagree.

CREATE TABLE IF NOT EXISTS `pool`.`portfolio_rewards` (
  `address`     varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `reward_date` date NOT NULL,
  -- The validator that paid, so a switch mid-history stays visible and a
  -- staker delegating to several is not silently merged into one line.
  `validator`   varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `rewards`     bigint unsigned NOT NULL DEFAULT 0,
  `created_at`  datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`address`, `reward_date`, `validator`),
  KEY `idx_address_date` (`address`, `reward_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Backfill bookkeeping, so a run can be resumed, retried and rate limited
-- rather than starting from scratch every night.
ALTER TABLE `pool`.`portfolio_accounts`
  -- Latest day we hold rewards for. NULL means never backfilled.
  ADD COLUMN `rewards_synced_to` date DEFAULT NULL,
  ADD COLUMN `rewards_synced_at` datetime DEFAULT NULL,
  -- Stamped before the request, so a run that dies mid-fetch still backs off
  -- instead of hammering the same address every night.
  ADD COLUMN `rewards_attempted_at` datetime DEFAULT NULL,
  ADD COLUMN `rewards_failures` smallint unsigned NOT NULL DEFAULT 0;
