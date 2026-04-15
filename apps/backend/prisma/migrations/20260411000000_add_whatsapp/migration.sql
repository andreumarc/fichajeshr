-- CreateEnum
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('TEXT', 'LOCATION', 'IMAGE', 'DOCUMENT', 'BUTTON', 'TEMPLATE', 'INTERACTIVE');

-- CreateEnum
CREATE TYPE "WhatsAppConversationState" AS ENUM ('IDLE', 'AWAITING_LOCATION', 'AWAITING_CONFIRMATION');

-- CreateTable
CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL UNIQUE,
    "phone" TEXT NOT NULL,
    "state" "WhatsAppConversationState" NOT NULL DEFAULT 'IDLE',
    "pendingIntent" TEXT,
    "pendingContext" JSONB,
    "contextExpiresAt" TIMESTAMP(3),
    "lastMessageAt" TIMESTAMP(3),
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "employeeId" TEXT,
    "conversationId" TEXT,
    "providerMessageId" TEXT,
    "direction" "WhatsAppMessageDirection" NOT NULL,
    "type" "WhatsAppMessageType" NOT NULL DEFAULT 'TEXT',
    "fromPhone" TEXT,
    "toPhone" TEXT,
    "body" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "intentParsed" TEXT,
    "timeEntryId" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_conversations_phone_key" ON "whatsapp_conversations"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_phone_idx" ON "whatsapp_conversations"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_employeeId_idx" ON "whatsapp_conversations"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_providerMessageId_key" ON "whatsapp_messages"("providerMessageId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_conversationId_idx" ON "whatsapp_messages"("conversationId");

-- CreateIndex
CREATE INDEX "whatsapp_messages_employeeId_idx" ON "whatsapp_messages"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_companyId_name_key" ON "whatsapp_templates"("companyId", "name");

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "whatsapp_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
