CREATE TABLE IF NOT EXISTS public.visits (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    url text NOT NULL,
    title text NOT NULL DEFAULT '',
    domain text NOT NULL,
    device_hostname text NOT NULL,
    browser text NOT NULL DEFAULT 'Chromium',
    transition text NOT NULL DEFAULT 'navigate',
    visited_at timestamptz NOT NULL,
    CONSTRAINT visits_url_visited_at_key UNIQUE (url, visited_at)
);

CREATE INDEX IF NOT EXISTS visits_visited_at_idx
    ON public.visits (visited_at DESC);

ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.visits FROM anon, authenticated;
