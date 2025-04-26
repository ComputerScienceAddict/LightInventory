-- Create a storage bucket for materials
insert into storage.buckets (id, name, public)
values ('materials', 'materials', true);

-- Create the material_analysis table
create table public.material_analysis (
    id uuid default gen_random_uuid() primary key,
    image_url text not null,
    analysis text not null,
    processed_at timestamp with time zone default now(),
    created_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS)
alter table public.material_analysis enable row level security;

-- Create a policy to allow public read access
create policy "Public can view material analysis"
    on public.material_analysis
    for select
    to public
    using (true);

-- Create a policy to allow public insert access
create policy "Public can insert material analysis"
    on public.material_analysis
    for insert
    to public
    with check (true);

-- Create storage policies
create policy "Public can upload materials"
    on storage.objects
    for insert
    to public
    with check (bucket_id = 'materials');

create policy "Public can view materials"
    on storage.objects
    for select
    to public
    using (bucket_id = 'materials'); 