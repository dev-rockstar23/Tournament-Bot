'use client'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeTournament(guildId: string, tournamentId: string) {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`server:${guildId}:public`)
      .on('broadcast', { event: 'standings_updated' }, () => {
        queryClient.invalidateQueries({ queryKey: ['standings', tournamentId] })
      })
      .on('broadcast', { event: 'tournament_status_changed' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [guildId, tournamentId, queryClient])
}

export function useRealtimeMatch(guildId: string, matchId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`server:${guildId}:public`)
      .on('broadcast', { event: 'match_status_changed' }, (payload) => {
        if (payload.payload?.matchId === matchId) {
          queryClient.invalidateQueries({ queryKey: ['match', matchId] })
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [guildId, matchId, queryClient])
}
