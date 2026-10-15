export * from './types';

// BGMI exports
export {
  BGMI_DEFAULT_CONFIG,
  calculateMatchScore as calculateBgmiMatchScore,
  calculateStandings as calculateBgmiStandings,
  applyTiebreakers,
} from './bgmi';

// Free Fire exports
export {
  FREE_FIRE_DEFAULT_CONFIG,
  calculateMatchScore as calculateFreeFireMatchScore,
  calculateStandings as calculateFreeFireStandings,
  calculateClashSquadSeries,
} from './free-fire';

// CODM exports
export {
  CODM_BR_DEFAULT_CONFIG,
  calculateMatchScore as calculateCodmMatchScore,
  calculateStandings as calculateCodmStandings,
  calculateMultiplayerSeries,
} from './codm';

// Generic helpers
export { calculateStandings } from './bgmi';
export { getDefaultConfig } from './defaults';
