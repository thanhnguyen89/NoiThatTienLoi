// Test fixed toPlain function
function toPlainOld(row) {
  return JSON.parse(JSON.stringify(row, (_, v) => {
    if (typeof v === 'bigint') return Number(v);
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      if ('toString' in v) return String(v);
    }
    return v;
  }));
}

function toPlainNew(row) {
  return JSON.parse(JSON.stringify(row, (_, v) => {
    if (typeof v === 'bigint') return Number(v);
    // Convert Prisma Decimal to number (Decimal has specific constructor)
    if (v !== null && typeof v === 'object' && v.constructor?.name === 'Decimal') {
      return Number(v.toString());
    }
    return v;
  }));
}

const testData = {
  id: "cmnvx670i002vuu7sa76a44p5",
  code: "KHO-CT-01",
  name: "Kho Cần Thơ",
  contactName: "Võ Thị Bích",
  latitude: 10.036,
  longitude: 105.7872,
  isActive: true,
  createdAt: new Date("2026-04-12T15:29:31.651Z"),
  _count: { shipments: 6 }
};

console.log('📦 Original:');
console.log(testData);

console.log('\n❌ OLD toPlain (broken):');
const oldResult = toPlainOld(testData);
console.log(oldResult);

console.log('\n✅ NEW toPlain (fixed):');
const newResult = toPlainNew(testData);
console.log(newResult);
console.log('\nname:', newResult.name);
console.log('code:', newResult.code);
console.log('latitude:', newResult.latitude);
