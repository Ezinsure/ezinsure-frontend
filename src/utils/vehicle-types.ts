/**
 * Centralized vehicle type definitions
 * 
 * This file contains all vehicle types, motorcycle types, and vehicle use options
 * used throughout the application. To add or modify vehicle types, edit this file only.
 */

/**
 * Car/Vehicle types available for Car Insurance
 * Add new types here to make them available across the entire application
 */
export const carTypes: readonly string[] = [
  'Ambulance',
  'Camionette',
  'Coaster',
  'Daihatsu',
  'Hiace',
  'Jeep',
  'Mitsubishi Fuso',
  'Pickup',
  'Poid Lourds',
  'Remorque',
  'Voiture',
  'Other'
];

/**
 * Motorcycle types available for MotorBike Insurance
 */
export const motoTypes: readonly string[] = [
  'Electric',
  'Moped',
  'Motorcycle',
  'Scooter',
  'Other'
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

