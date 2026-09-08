-- Portfolio tables. Applied by hand; there is no migration tool in this repo.
--
--   ssh <host> 'mysql --defaults-file=/etc/mysql/debian.cnf' < server/sql/portfolio.sql
--
-- The app's `pool` user has SELECT/INSERT/UPDATE/DELETE on pool.* and no
-- CREATE, so DDL needs an admin login. Those grants cover these tables
-- automatically once they exist -- nothing further to grant.
--
-- Balances are Luna (1 NIM = 1e5 Luna), stored as integers for the same reason
-- the rest of the schema does: a NIM amount must never go near a float.

CREATE TABLE IF NOT EXISTS `pool`.`portfolio_accounts` (
  `address`    varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  -- Addresses sharing a bundle_id can see each other. Proving control of an
  -- address is what puts it in a bundle -- see server/portfolio.js.
  `bundle_id`  char(32) COLLATE utf8mb4_general_ci NOT NULL,
  `first_seen` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen`  datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`address`),
  KEY `idx_bundle_id` (`bundle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pool`.`portfolio_snapshots` (
  `address`       varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `snapshot_date` date NOT NULL,
  `liquid`        bigint unsigned NOT NULL DEFAULT 0,
  `staked`        bigint unsigned NOT NULL DEFAULT 0,
  `inactive`      bigint unsigned NOT NULL DEFAULT 0,
  `retired`       bigint unsigned NOT NULL DEFAULT 0,
  -- Which validator the stake sat with that day, so switching pools shows up
  -- in the history instead of appearing as an unexplained step in the numbers.
  `validator`     varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `nim_usd`       decimal(18,10) DEFAULT NULL,
  `created_at`    datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`address`, `snapshot_date`),
  KEY `idx_snapshot_date` (`snapshot_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
