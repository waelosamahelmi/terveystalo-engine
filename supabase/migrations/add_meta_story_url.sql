-- Add meta_video_url and meta_story_url columns to dental_campaigns table
-- meta_video_url stores the 1080x1080 feed video URL
-- meta_story_url stores the 1080x1920 stories/reels video URL

ALTER TABLE dental_campaigns
ADD COLUMN IF NOT EXISTS meta_video_url TEXT;

ALTER TABLE dental_campaigns
ADD COLUMN IF NOT EXISTS meta_story_url TEXT;

COMMENT ON COLUMN dental_campaigns.meta_video_url IS '1080x1080 Meta feed video URL (generated server-side)';
COMMENT ON COLUMN dental_campaigns.meta_story_url IS '1080x1920 Meta stories/reels video URL (generated server-side)';
