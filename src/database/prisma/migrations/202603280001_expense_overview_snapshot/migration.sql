-- CreateTable
CREATE TABLE `expense_overview_snapshots` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `period` ENUM('week', 'month', 'year') NOT NULL,
  `anchorDate` DATE NOT NULL,
  `rangeStart` DATETIME(3) NOT NULL,
  `rangeEnd` DATETIME(3) NOT NULL,
  `totalAmount` BIGINT NOT NULL,
  `lastSuccessfulRefreshAt` DATETIME(3) NULL,
  `lastAttemptAt` DATETIME(3) NULL,
  `refreshStatus` ENUM('success', 'failed', 'stale') NOT NULL DEFAULT 'success',
  `isEmpty` BOOLEAN NOT NULL DEFAULT false,
  `groups` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `expense_overview_snapshots_userId_period_anchorDate_key`(`userId`, `period`, `anchorDate`),
  INDEX `expense_overview_snapshots_userId_period_idx`(`userId`, `period`),
  INDEX `expense_overview_snapshots_userId_period_rangeStart_rangeEnd_idx`(`userId`, `period`, `rangeStart`, `rangeEnd`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
