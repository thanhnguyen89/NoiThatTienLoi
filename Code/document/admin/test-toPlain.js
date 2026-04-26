// Test toPlain function
function toPlain(row) {
  return JSON.parse(JSON.stringify(row, (_, v) => {
    if (typeof v === 'bigint') return Number(v);
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      if ('toString' in v) return String(v);
    }
    return v;
  }));
}

const testData = {
  id: "cmnvx670i002vuu7sa76a44p5",
  code: "KHO-CT-01",
  name: "Kho Cần Thơ",
  contactName: "Võ Thị Bích",
  contactPhone: "02921234567",
  provinceName: "Cần Thơ",
  districtName: "Quận Ninh Kiều",
  wardName: "Phường Tân Chánh Hiệp",
  addressLine: "321 Đường 3 Tháng 2",
  fullAddress: "321 Đường 3 Tháng 2, Quận Ninh Kiều, Cần Thơ",
  latitude: 10.036,
  longitude: 105.7872,
  isActive: true,
  createdAt: new Date("2026-04-12T15:29:31.651Z"),
  updatedAt: new Date("2026-04-12T15:29:31.651Z"),
  createdBy: null,
  updatedBy: null,
  isDeleted: false,
  deletedBy: null,
  deletedAt: null,
  _count: {
    shipments: 6
  }
};

console.log('📦 Original data:');
console.log(JSON.stringify(testData, null, 2));

console.log('\n🔄 After toPlain:');
const result = toPlain(testData);
console.log(JSON.stringify(result, null, 2));

console.log('\n🔍 Comparison:');
console.log('createdAt type:', typeof result.createdAt);
console.log('createdAt value:', result.createdAt);
