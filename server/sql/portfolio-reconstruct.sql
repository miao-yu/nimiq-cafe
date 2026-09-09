-- Marks snapshot rows that were reconstructed backwards rather than observed,
-- and tracks which addresses have had that done.
--
--   ssh <host> 'mysql --defaults-file=/etc/mysql/debian.cnf' < server/sql/portfolio-reconstruct.sql

ALTER TABLE `pool`.`portfolio_snapshots`
  -- 0 = recorded live by storePortfolioSnapshots.js that day.
  -- 1 = derived by walking today's balance back through transactions and
  --     restakes. Totals are exact; inactive and retired are folded into
  --     `staked`, because separating them needs the staking payload decoded
  --     and nothing plots them apart.
  ADD COLUMN `reconstructed` tinyint(1) NOT NULL DEFAULT 0,
  -- The walk went negative, meaning the transaction list was truncated and
  -- inflows are missing. Kept so a wrong-looking chart can be explained rather
  -- than guessed at.
  ADD COLUMN `underflow` tinyint(1) NOT NULL DEFAULT 0;

ALTER TABLE `pool`.`portfolio_accounts`
  ADD COLUMN `history_reconstructed_at` datetime DEFAULT NULL,
  ADD COLUMN `history_truncated` tinyint(1) NOT NULL DEFAULT 0;
