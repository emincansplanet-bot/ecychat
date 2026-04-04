import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(password, 12);
  const adminEmail =
    process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() || "admin@ecychat.local";
  const operatorEmail =
    process.env.SEED_OPERATOR_EMAIL?.trim().toLowerCase() ||
    "operator@ecychat.local";

  const org = await prisma.organization.upsert({
    where: { id: "seed-org-ecychat" },
    create: {
      id: "seed-org-ecychat",
      name: "ECYChat Demo",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      name: "Admin",
      role: UserRole.ADMIN,
      organizationId: org.id,
      active: true,
    },
    update: {
      passwordHash,
      active: true,
    },
  });

  await prisma.user.upsert({
    where: { email: operatorEmail },
    create: {
      email: operatorEmail,
      passwordHash,
      name: "Operatör",
      role: UserRole.OPERATOR,
      organizationId: org.id,
      active: true,
    },
    update: {
      passwordHash,
      active: true,
    },
  });

  const channel = await prisma.whatsAppChannel.upsert({
    where: { id: "seed-channel-1" },
    create: {
      id: "seed-channel-1",
      organizationId: org.id,
      internalLabel: "Demo hat",
      metaPhoneNumberId: process.env.SEED_META_PHONE_NUMBER_ID?.trim() || null,
    },
    update: {
      internalLabel: "Demo hat",
      ...(process.env.SEED_META_PHONE_NUMBER_ID?.trim()
        ? { metaPhoneNumberId: process.env.SEED_META_PHONE_NUMBER_ID.trim() }
        : {}),
    },
  });

  const contact = await prisma.contact.upsert({
    where: {
      organizationId_waId: { organizationId: org.id, waId: "9000000000001" },
    },
    create: {
      organizationId: org.id,
      waId: "9000000000001",
      displayName: "Demo Müşteri",
      tags: ["VIP", "Yeni"],
    },
    update: {
      displayName: "Demo Müşteri",
      tags: ["VIP", "Yeni"],
    },
  });

  const conversation = await prisma.conversation.upsert({
    where: {
      channelId_contactId: { channelId: channel.id, contactId: contact.id },
    },
    create: {
      organizationId: org.id,
      channelId: channel.id,
      contactId: contact.id,
      lastMessageAt: new Date(),
    },
    update: { lastMessageAt: new Date() },
  });

  const operator = await prisma.user.findUnique({
    where: { email: "operator@ecychat.local" },
  });

  if (operator) {
    const existingAssign = await prisma.conversationAssignment.findFirst({
      where: {
        conversationId: conversation.id,
        userId: operator.id,
        unassignedAt: null,
      },
    });
    if (!existingAssign) {
      await prisma.conversationAssignment.create({
        data: { conversationId: conversation.id, userId: operator.id },
      });
    }
  }

  await prisma.message.upsert({
    where: { waMessageId: "seed-demo-wamid-1" },
    create: {
      conversationId: conversation.id,
      direction: "INBOUND",
      type: "TEXT",
      body: "Merhaba, bu bir demo mesajıdır (seed).",
      waMessageId: "seed-demo-wamid-1",
    },
    update: {},
  });

  await prisma.message.upsert({
    where: { waMessageId: "seed-demo-wamid-2" },
    create: {
      conversationId: conversation.id,
      direction: "INBOUND",
      type: "TEXT",
      body: "Ürünleriniz hakkında bilgi alabilir miyim?",
      waMessageId: "seed-demo-wamid-2",
    },
    update: {},
  });

  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@ecychat.local" },
  });
  if (adminUser) {
    await prisma.message.upsert({
      where: { waMessageId: "seed-demo-wamid-out-1" },
      create: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        type: "TEXT",
        body: "Tabii, memnuniyetle. Hangi konuda yardımcı olalım?",
        waMessageId: "seed-demo-wamid-out-1",
        sentByUserId: adminUser.id,
      },
      update: {},
    });
  }

  await prisma.quickReply.deleteMany({ where: { organizationId: org.id } });
  await prisma.quickReply.createMany({
    data: [
      {
        organizationId: org.id,
        title: "Karşılama",
        body: "Merhaba! ECYChat üzerinden yazıyorum. Size nasıl yardımcı olabilirim?",
        sortOrder: 0,
      },
      {
        organizationId: org.id,
        title: "Teşekkür",
        body: "İlginiz için teşekkür ederiz. İyi günler dileriz.",
        sortOrder: 1,
      },
      {
        organizationId: org.id,
        title: "Beklemede",
        body: "Kısa süre içinde dönüş yapacağım, lütfen hatta kalın.",
        sortOrder: 2,
      },
    ],
  });

  await prisma.promotion.deleteMany({ where: { organizationId: org.id } });
  await prisma.promotion.createMany({
    data: [
      {
        organizationId: org.id,
        title: "İlkbahar indirimi",
        body: "Seçili ürünlerde %15 indirim — kod: BAHAR15",
        sortOrder: 0,
      },
      {
        organizationId: org.id,
        title: "Ücretsiz kargo",
        body: "500₺ ve üzeri siparişlerde kargo bizden!",
        sortOrder: 1,
      },
    ],
  });

  console.log(`Seed OK — admin: ${adminEmail} / operatör: ${operatorEmail}`);
  console.log("Şifre her iki hesap için SEED_ADMIN_PASSWORD (yoksa changeme123).");
  console.log("Demo konuşma: gelen kutusunda görünür (operatöre atanmış).");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
