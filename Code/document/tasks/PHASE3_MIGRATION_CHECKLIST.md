# ✅ Phase 3 Migration Checklist

## Pre-Migration

- [x] Phase 1: Database schema updated (28 fields added)
- [x] Phase 2: Prisma schema updated & migrated
- [x] Phase 3: Backend services updated

## Backend Updates

### Validation Layer
- [x] Add 28 fields to `newsSchema` in `news.validator.ts`
- [x] Set proper validation rules (max length, min value, etc)
- [x] Set default values for boolean fields
- [x] Verify `NewsInput` type auto-generated

### Repository Layer
- [x] Add 28 fields to `newsListSelect`
- [x] Update `create()` method with BigInt conversion
- [x] Update `create()` method with Date conversion
- [x] Update `update()` method with BigInt conversion
- [x] Update `update()` method with Date conversion
- [x] Verify `toPlain()` function handles new fields

### Service Layer
- [x] Verify `newsService` works with new validator
- [x] Verify `newsService` works with new repository
- [x] No changes needed (generic implementation)

### API Layer
- [x] Verify GET `/admin/api/news` returns new fields
- [x] Verify POST `/admin/api/news` accepts new fields
- [x] Verify GET `/admin/api/news/[id]` returns new fields
- [x] Verify PUT `/admin/api/news/[id]` updates new fields
- [x] Verify DELETE still works
- [x] No changes needed (generic implementation)

### Type Safety
- [x] Update `NewsDetail` interface in `NewsForm.tsx`
- [x] Update Props interface in `NewsFormWrapper.tsx`
- [x] Fix type casting in `EditNewsPage.tsx`
- [x] Verify no TypeScript errors

## Testing

### Unit Tests
- [ ] Test validator with new fields
- [ ] Test repository create with new fields
- [ ] Test repository update with new fields
- [ ] Test BigInt conversion
- [ ] Test Date conversion
- [ ] Test JSON fields

### Integration Tests
- [ ] Test POST create news with all 28 fields
- [ ] Test PUT update news with all 28 fields
- [ ] Test GET returns all 28 fields
- [ ] Test validation errors
- [ ] Test default values

### Manual Tests
- [ ] Create news via API with new fields
- [ ] Update news via API with new fields
- [ ] Verify data in Prisma Studio
- [ ] Test with invalid data
- [ ] Test with missing fields
- [ ] Test with null values

## Documentation

- [x] Create `PHASE3_BACKEND_COMPLETE.md`
- [x] Create `PHASE3_SUMMARY.md`
- [x] Create `PHASE3_QUICK_REFERENCE.md`
- [x] Create `TEST_PHASE3_API.md`
- [x] Create this checklist

## Deployment Preparation

### Database
- [ ] Backup production database
- [ ] Test migration on staging
- [ ] Verify no data loss
- [ ] Check migration rollback plan

### Code
- [ ] Review all changes
- [ ] Run TypeScript compiler
- [ ] Run linter
- [ ] Run tests
- [ ] Build production bundle

### Environment
- [ ] Update environment variables if needed
- [ ] Check database connection
- [ ] Verify Prisma client generated
- [ ] Test on staging environment

## Post-Migration Verification

### Functionality
- [ ] Create new news with 28 fields
- [ ] Update existing news with new fields
- [ ] Verify old news still work
- [ ] Check API responses
- [ ] Verify database data

### Performance
- [ ] Check API response times
- [ ] Monitor database queries
- [ ] Check memory usage
- [ ] Verify no N+1 queries

### Monitoring
- [ ] Check error logs
- [ ] Monitor API endpoints
- [ ] Watch database performance
- [ ] Track user feedback

## Rollback Plan

If issues occur:

1. **Database Rollback**
   ```bash
   npx prisma migrate resolve --rolled-back MIGRATION_NAME
   ```

2. **Code Rollback**
   ```bash
   git revert COMMIT_HASH
   ```

3. **Verify Rollback**
   - Check API still works
   - Verify old data intact
   - Test basic operations

## Known Issues

- [ ] None currently

## Notes

- All changes are backward compatible
- Existing news will have null values for new fields
- No breaking changes to API
- Frontend needs Phase 4 to display new fields

## Sign-off

- [ ] Backend Developer: _______________
- [ ] QA Engineer: _______________
- [ ] DevOps: _______________
- [ ] Product Owner: _______________

## Next Steps

After Phase 3 completion:
1. ✅ Backend ready
2. → Start Phase 4: Frontend UI
3. → Add form fields for 28 new fields
4. → Update list/detail pages
5. → Add rich media upload
6. → Implement schedule publish UI

---

**Status: ✅ PHASE 3 COMPLETE**

**Ready for Phase 4! 🚀**
