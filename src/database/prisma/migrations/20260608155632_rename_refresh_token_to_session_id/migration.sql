/*
  Warnings:

  - You are about to drop the column `refreshToken` on the `user_devices` table. All the data in the column will be lost.
  - Added the required column `sessionId` to the `user_devices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `user_devices` DROP COLUMN `refreshToken`,
    ADD COLUMN `sessionId` VARCHAR(36) NOT NULL;

-- CreateIndex
CREATE INDEX `user_devices_sessionId_idx` ON `user_devices`(`sessionId`);
