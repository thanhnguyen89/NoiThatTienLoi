const { warehouseService } = require('./dist/server/services/warehouse.service.js');

async function testWarehouseAPI() {
  try {
    console.log('🔍 Testing warehouse service...\n');

    // Test getAllWarehouses
    const result = await warehouseService.getAllWarehouses({
      page: 1,
      pageSize: 20
    });

    console.log('📊 Result from getAllWarehouses:');
    console.log(`Total: ${result.pagination.total}`);
    console.log(`Page: ${result.pagination.page}`);
    console.log(`PageSize: ${result.pagination.pageSize}`);
    console.log(`TotalPages: ${result.pagination.totalPages}`);
    console.log(`Data count: ${result.data.length}\n`);

    if (result.data.length > 0) {
      console.log('📦 First warehouse:');
      console.log(JSON.stringify(result.data[0], null, 2));
    } else {
      console.log('⚠️  No warehouses returned from service!');
    }

  } catch (error) {
    console.error('❌ Error testing warehouse API:', error);
  }
}

testWarehouseAPI();
