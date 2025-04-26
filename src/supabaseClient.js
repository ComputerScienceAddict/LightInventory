import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zzhidluzdwhizmxugbre.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6aGlkbHV6ZHdoaXpteHVnYnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1NjI4NTksImV4cCI6MjA2MTEzODg1OX0.QapOPR-XJtZYhxaZwfEYAkdQTNmcV4TmtCNwB-4ljsY';

export const supabase = createClient(supabaseUrl, supabaseKey); 