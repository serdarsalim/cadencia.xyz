ALTER TABLE "UserProfile" ADD COLUMN "scoreLabels" TEXT NOT NULL DEFAULT '["Low","Partial","Good","Excellent"]';
ALTER TABLE "UserProfile" ADD COLUMN "scoreDisplayMode" TEXT NOT NULL DEFAULT 'percentage';
