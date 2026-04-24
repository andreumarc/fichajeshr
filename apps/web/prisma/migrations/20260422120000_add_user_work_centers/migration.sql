-- CreateTable: user_work_centers (bridge for multi-clinic access per user)
CREATE TABLE "user_work_centers" (
    "userId" TEXT NOT NULL,
    "workCenterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_work_centers_pkey" PRIMARY KEY ("userId","workCenterId")
);

CREATE INDEX "user_work_centers_userId_idx" ON "user_work_centers"("userId");
CREATE INDEX "user_work_centers_workCenterId_idx" ON "user_work_centers"("workCenterId");

ALTER TABLE "user_work_centers" ADD CONSTRAINT "user_work_centers_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_work_centers" ADD CONSTRAINT "user_work_centers_workCenterId_fkey"
    FOREIGN KEY ("workCenterId") REFERENCES "work_centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
