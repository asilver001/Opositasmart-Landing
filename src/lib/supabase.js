import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yutfgmiyndmhsjhzxkdr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1dGZnbWl5bmRtaHNqaHp4a2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MDE2OTksImV4cCI6MjA4MTM3NzY5OX0.U1X8dmdHjzybKHtWJ4-kcJSrigELUhynhZcs8tU8NwI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
