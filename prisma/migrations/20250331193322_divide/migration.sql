/*
  Warnings:

  - You are about to drop the `Todos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Todos" DROP CONSTRAINT "Todos_authorId_fkey";

-- DropTable
DROP TABLE "Todos";

-- DropTable
DROP TABLE "User";

-- DropEnum
DROP TYPE "Status";
