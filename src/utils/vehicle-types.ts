/**
 * Centralized vehicle type definitions
 *
 * This file contains all vehicle types, motorcycle types, and vehicle use options
 * used throughout the application. To add or modify vehicle types, edit this file only.
 *
 * Car types  → codes 001–805 (deduplicated)
 * Moto types → codes 901–906
 */

/**
 * Car / vehicle types available for Car Insurance.
 * Alphabetically sorted; duplicates across code groups removed.
 */
export const carTypes: readonly string[] = [
  'Bus',
  'Bus Private',
  'Bus Taxi',
  'Bus Transport',
  'Camion',
  'Camion FUSO, HOWO, SHACKMAN, FAW',
  'Camionette (-4t)',
  'Camionette (+=4t)',
  'Camionnettes (d.cab)',
  'Car-Voiture/Salon Driving School',
  'Car-Voiture/Salon For Hire',
  'Car-Voiture/Salon Private',
  'Car-Voiture/Salon Taxi',
  'Car-Voiture/Salon Transp. Goods',
  'Fourgonnette',
  'Jeep Driving School',
  'Jeep For Hire',
  'Jeep Private',
  'Jeep Suzuki/Jimmy',
  'Jeep Taxi',
  'Jeep Transp. Goods',
  'Minibus',
  'Minibus For Hire',
  'Minibus Private',
  'Poids Lourds',
  'Remorque',
  'Semi-remorque',
  'Specific Engines (-4T)',
  'Specific Engines (+4T)',
  'Tracteur - Flamable',
  'Tracteur Seul',
];

/**
 * Motorcycle / velomoteur types available for MotorBike Insurance.
 * Alphabetically sorted; duplicates removed.
 */
export const motoTypes: readonly string[] = [
  'Electric',
  'Moped',
  'Moto Transport',
  'Moto/Velomoteur',
  'Moto/Velomoteur Private',
  'Motorcycle',
  'Other',
  'Scooter',
  'Sidecar',
  'Velomoteur Location',
  'Velomoteur Transport',
];

/**
 * Vehicle use options for Car Insurance
 */
export const carUses: readonly string[] = [
  'Private',
  'PSV / TAXI',
  'Commercial - Transport of Goods',
  'Commercial - Auto Ecole',
  'Commercial - School Bus',
  'Commercial - Ambulance',
  'Commercial - Transport of Fuel',
  'Commercial - For Hire',
  'Commercial - Mechanic',
  'Commercial - Specific Use',
  'Other'
];

/**
 * Vehicle use options for MotorBike Insurance
 */
export const motoUses: readonly string[] = [
  'Private',
  'PSV / TAXI',
  'Commercial - Transport of Goods',
  'Other'
];

