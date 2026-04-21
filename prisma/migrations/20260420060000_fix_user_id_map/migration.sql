-- Drop the old solo unique index on key (leftover from before user isolation)
DROP INDEX IF EXISTS "client_memory_key_key";
