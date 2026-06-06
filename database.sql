-- ─── PURPLE SANDWICH KARAOKE — DATABASE SETUP ─────────────────────────────────
-- Run this entire file in your Supabase SQL Editor to set up the schema.
-- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

-- Events (one per night / gig)
create table events (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  venue text,
  date date not null default current_date,
  status text default 'active', -- active | closed
  created_at timestamptz default now()
);

-- Singer requests (one per submission)
create table requests (
  id uuid default gen_random_uuid() primary key,
  singer_name text not null,
  event_id uuid references events(id),
  created_at timestamptz default now()
);

-- Individual songs within each request
create table request_songs (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references requests(id) on delete cascade,
  song_id integer not null,
  song_title text not null,
  song_artist text not null,
  song_key text not null,
  song_genre text not null
);

-- Live queue (band manages this)
create table queue (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references requests(id) on delete cascade,
  event_id uuid references events(id),
  singer_name text not null,
  song_id integer not null,
  song_title text not null,
  song_artist text not null,
  song_key text not null,
  song_genre text not null,
  position integer not null default 0,
  status text default 'queued', -- queued | playing | done
  created_at timestamptz default now()
);

-- Enable real-time updates
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table queue;
