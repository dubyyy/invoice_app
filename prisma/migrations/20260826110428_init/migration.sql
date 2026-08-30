-- CreateTable
CREATE TABLE "Price" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleModel" TEXT,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);
