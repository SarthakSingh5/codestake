-- Table: challenge_contracts
-- Description: Tracks multi-day macro-stakes like The Blood Pact and The Gauntlet

CREATE TABLE public.challenge_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('blood_pact', 'gauntlet')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
    
    -- Config
    target_days INT NOT NULL DEFAULT 1,
    target_problems_per_day INT NOT NULL DEFAULT 1,
    penalty_cents INT NOT NULL DEFAULT 0,
    
    -- State Tracking
    current_day INT NOT NULL DEFAULT 1,
    problems_solved_today INT NOT NULL DEFAULT 0,
    total_problems_solved INT NOT NULL DEFAULT 0,
    
    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL, -- Midnight for Blood Pact, +3 hrs for Gauntlet
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.challenge_contracts ENABLE ROW LEVEL SECURITY;

-- Policies (Assuming standard Supabase auth)
CREATE POLICY "Users can view their own contracts" 
ON public.challenge_contracts FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage contracts" 
ON public.challenge_contracts FOR ALL 
USING (true); -- Usually bypassed by service_role key anyway, but good practice.
