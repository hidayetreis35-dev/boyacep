export * from './types';
export * from './defaults';
export { calculateAreas, validateRoom } from './surfaces';
export { calculateRoom, needsPrimer, type RoomCalculation } from './paint';
export { planPackages } from './packaging';
export {
  calculateProject,
  type ProjectCalculation,
  type ProjectOptions,
  type ProjectTotals,
} from './project';
export { quickEstimate, HOUSE_TYPES, WALL_FACTOR, type HouseType, type QuickEstimate, type QuickInput } from './quick';
