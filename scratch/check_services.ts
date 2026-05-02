import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.service.count({ where: { isPublished: true, deletedAt: null } });
  const services = await prisma.service.findMany({ 
    where: { isPublished: true, deletedAt: null },
    include: { providerSlots: true }
  });
  console.log(`Published services: ${count}`);
  services.forEach(s => {
    const available = s.providerSlots.reduce((acc, slot) => acc + Math.max(0, slot.capacity - slot.booked), 0);
    console.log(`- ${s.title}: ${s.providerSlots.length} slots, ${available} available`);
  });
}
main();
