
-- Token chat messages table
CREATE TABLE public.token_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_symbol TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Token chat presence (online users)
CREATE TABLE public.token_chat_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_symbol TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(token_symbol, wallet_address)
);

-- Following system
CREATE TABLE public.wallet_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_address TEXT NOT NULL,
  following_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_address, following_address)
);

-- Enable RLS
ALTER TABLE public.token_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_chat_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_follows ENABLE ROW LEVEL SECURITY;

-- Chat messages: anyone can read, anyone can insert
CREATE POLICY "Anyone can read chat messages" ON public.token_chat_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send chat messages" ON public.token_chat_messages FOR INSERT WITH CHECK (true);

-- Presence: anyone can read, anyone can upsert
CREATE POLICY "Anyone can read presence" ON public.token_chat_presence FOR SELECT USING (true);
CREATE POLICY "Anyone can update presence" ON public.token_chat_presence FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can refresh presence" ON public.token_chat_presence FOR UPDATE USING (true);

-- Follows: anyone can read, anyone can manage
CREATE POLICY "Anyone can read follows" ON public.wallet_follows FOR SELECT USING (true);
CREATE POLICY "Anyone can follow" ON public.wallet_follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can unfollow" ON public.wallet_follows FOR DELETE USING (true);

-- Enable realtime for chat messages and presence
ALTER PUBLICATION supabase_realtime ADD TABLE public.token_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.token_chat_presence;

-- Indexes
CREATE INDEX idx_chat_messages_token ON public.token_chat_messages(token_symbol, created_at DESC);
CREATE INDEX idx_chat_presence_token ON public.token_chat_presence(token_symbol, last_seen DESC);
CREATE INDEX idx_follows_follower ON public.wallet_follows(follower_address);
CREATE INDEX idx_follows_following ON public.wallet_follows(following_address);
