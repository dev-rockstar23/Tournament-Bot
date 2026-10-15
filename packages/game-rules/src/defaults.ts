import type { CodmScoringConfig, ScoringConfig } from '@esports/shared-types';
import { BGMI_DEFAULT_CONFIG } from './bgmi';
import { FREE_FIRE_DEFAULT_CONFIG } from './free-fire';
import { CODM_BR_DEFAULT_CONFIG } from './codm';

export function getDefaultConfig(
  game: 'BGMI' | 'FREE_FIRE' | 'COD_MOBILE',
  mode: 'BATTLE_ROYALE' | 'CLASH_SQUAD' | 'MULTIPLAYER',
): ScoringConfig {
  switch (game) {
    case 'BGMI':
      return BGMI_DEFAULT_CONFIG;

    case 'FREE_FIRE':
      return FREE_FIRE_DEFAULT_CONFIG;

    case 'COD_MOBILE': {
      if (mode === 'MULTIPLAYER') {
        const mpConfig: CodmScoringConfig = {
          game: 'COD_MOBILE',
          mode: 'MULTIPLAYER',
          killPoints: CODM_BR_DEFAULT_CONFIG.killPoints,
          placementPoints: CODM_BR_DEFAULT_CONFIG.placementPoints,
          winBonus: CODM_BR_DEFAULT_CONFIG.winBonus,
        };
        return mpConfig;
      }
      // BATTLE_ROYALE and CLASH_SQUAD both use the BR config
      return CODM_BR_DEFAULT_CONFIG;
    }

    default: {
      // exhaustive check — TypeScript will narrow `game` to `never` here
      const _exhaustive: never = game;
      throw new Error(`Unknown game/mode combination: ${String(_exhaustive)}/${mode}`);
    }
  }
}
