const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const provider = await prisma.shippingProvider.findUnique({
    where: { id: 'cmnrq6u7q0006uujcorcni4dr' },
    select: {
      id: true,
      name: true,
      surcharges: true,
      discountPolicies: true,
      serviceTypes: true,
      vehicles: true,
    },
  });

  console.log('Provider data:');
  console.log(JSON.stringify(provider, null, 2));
  console.log('\nSurcharges:', provider?.surcharges);
  console.log('DiscountPolicies:', provider?.discountPolicies);

  const pricingCount = await prisma.shippingProviderPricing.count({
    where: { shippingProviderId: 'cmnrq6u7q0006uujcorcni4dr', isActive: true },
  });

  console.log('\nActive pricing rows:', pricingCount);

  const pricingRows = await prisma.shippingProviderPricing.findMany({
    where: { shippingProviderId: 'cmnrq6u7q0006uujcorcni4dr', isActive: true },
    take: 5,
  });

  console.log('\nSample pricing rows:');
  console.log(JSON.stringify(pricingRows, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
