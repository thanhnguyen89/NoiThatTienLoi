# 🔧 Fix News API Error

## ⚠️ Error
```
Invalid 'prisma.newsContent.findMany()' invocation
where: { isDeleted: false }
```

## 🔍 Root Cause
Prisma Client chưa được regenerate sau khi thêm 28 fields mới vào schema.

## ✅ Solution Applied

### 1. Updated Query Conditions
Changed `isDeleted: false` to handle nullable values:

```typescript
// ❌ Before
where: { isDeleted: false }

// ✅ After  
where: { 
  OR: [
    { isDeleted: false },
    { isDeleted: null }
  ]
}
```

This handles cases where `isDeleted` might be `null` in existing records.

### 2. Regenerate Prisma Client

**Stop dev server first:**
```bash
# Press Ctrl+C in terminal running dev server
```

**Then regenerate:**
```bash
cd NoiThatTienLoi/Code
npx prisma generate
```

**Restart dev server:**
```bash
npm run dev
```

## 📝 Files Updated
- `src/server/repositories/news.repository.ts`
  - `findAll()` - Updated where clause
  - `findAllPaginated()` - Updated where clause  
  - `findById()` - Updated where clause

## 🎯 Why This Works

The `isDeleted` field is `Boolean?` (nullable) in Prisma schema:
```prisma
isDeleted Boolean? @default(false)
```

Existing records might have:
- `isDeleted = false` (new records)
- `isDeleted = null` (old records before migration)

Using `OR` condition handles both cases.

## ✅ Verification

After restart, test:
```bash
curl http://localhost:3000/admin/news
```

Should return news list without errors.

## 🚀 Next Steps

1. Stop dev server (Ctrl+C)
2. Run `npx prisma generate`
3. Restart `npm run dev`
4. Refresh browser
5. News page should work!

---

**Status: Fix Applied ✅**

Restart dev server để apply changes!
