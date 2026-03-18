/**
 * Gets the effective factor for a lever on a method.
 *
 * If the lever is not applicable to the method, returns 0 (no effect).
 * If the selected option is the default baseline option (factor=1), returns 0 (no effect).
 * Otherwise returns the selected option's factor.
 *
 * Convention: 0 means "no effect" and is treated as 1 in the PRODUCT
 * by calcFinalIntensity(). This preserves exact backward compatibility
 * with waterfall decomposition and log-based lever attribution.
 */
export function getSelectedFactor(
  applicable: boolean,
  factor: number,
  isDefault: boolean
): number {
  if (!applicable || isDefault) return 0;
  return factor;
}
