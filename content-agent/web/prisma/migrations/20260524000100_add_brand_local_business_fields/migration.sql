-- Add LocalBusiness schema fields for brand profiles.
ALTER TABLE "brand_profiles"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "openingHours" VARCHAR(200),
ADD COLUMN "priceRange" VARCHAR(20);
