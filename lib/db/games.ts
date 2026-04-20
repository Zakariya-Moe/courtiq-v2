import { supabase } from './client';
import type { Game } from '@/lib/api/nba';

export async function upsertGames(games: Game[]) {
  if (!games.length) return;
  const { data: existing } = await supabase.from('games').select('*').in('id', games.map(g => g.id));
  const map = new Map((existing || []).map((g: any) => [g.id, g]));
  const updates = games
    .filter(g => { const p = map.get(g.id); return !p || p.home_score !== g.homeScore || p.away_score !== g.awayScore || p.status !== g.status; })
    .map(g => ({ id: g.id, home_team: g.homeTeam, away_team: g.awayTeam, home_score: g.homeScore, away_score: g.awayScore, status: g.status, last_updated: new Date().toISOString() }));
  if (updates.length) await supabase.from('games').upsert(updates);
}
