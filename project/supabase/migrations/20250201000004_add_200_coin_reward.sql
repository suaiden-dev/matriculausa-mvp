-- Add a 200-coin reward item to the store (id will be auto-generated)
-- Safe insert: only creates if an item with the same name does not already exist

INSERT INTO rewards (name, description, cost, type, value, duration, is_active, image_url)
SELECT 
  '1-Month Premium Support',
  'Get priority support for 1 month for your application and documents.',
  200,
  'premium_access',
  0,
  1,
  true,
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM rewards WHERE name = '1-Month Premium Support'
);


