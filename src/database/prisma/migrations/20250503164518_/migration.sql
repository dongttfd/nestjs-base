-- CreateIndex
CREATE INDEX `consumptions_date_idx` ON `consumptions`(`date`);

-- CreateIndex
CREATE INDEX `consumptions_userId_date_idx` ON `consumptions`(`userId`, `date`);

-- CreateIndex
CREATE INDEX `investments_date_idx` ON `investments`(`date`);

-- CreateIndex
CREATE INDEX `investments_userId_date_idx` ON `investments`(`userId`, `date`);
