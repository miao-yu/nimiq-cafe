-- Watchlists: which addresses a signed-in address follows.
--
--   ssh <host> 'mysql --defaults-file=/etc/mysql/debian.cnf' < server/sql/portfolio-watchlist.sql
--
-- Replaces the symmetric bundle in portfolio_accounts.bundle_id. Adding an
-- address no longer requires signing with it, so membership can no longer be
-- two-way: watching says nothing about who controls an address, and the old
-- model would have let anyone paste a stranger's address and end up sharing a
-- portfolio with them in both directions.
--
-- portfolio_accounts stays exactly as it is. It is not only the bundle table --
-- it is the registry of every address we track, which is what
-- getSnapshotTargets reads and where the backfill state columns live. A watched
-- address gets a row there too, so it picks up daily snapshots and reward
-- backfill like any other. bundle_id keeps being written and stops meaning
-- anything; dropping the column would break the NOT NULL insert for no gain.

CREATE TABLE IF NOT EXISTS `pool`.`portfolio_watchlist` (
  -- The signed-in address. Only it can see this list.
  `owner_address`   varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  -- An address it follows. Unproven by design: the chain is public.
  `watched_address` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `added_at`        datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`owner_address`, `watched_address`),
  -- "who is watching this address" — for pruning work nobody reads any more.
  KEY `idx_watched_address` (`watched_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Carry the existing bundles over as watchlists, both ways.
--
-- Two-way on purpose: everyone in a bundle can already see everyone else, so
-- this preserves exactly what those people see today rather than quietly taking
-- a view away. New links are one-way from here on.
INSERT IGNORE INTO `pool`.`portfolio_watchlist` (owner_address, watched_address, added_at)
SELECT a.address, b.address, NOW()
FROM `pool`.`portfolio_accounts` a
JOIN `pool`.`portfolio_accounts` b
  ON a.bundle_id = b.bundle_id AND a.address <> b.address;
