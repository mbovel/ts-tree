/**
 * DeltaCalculator must validate these identities:
 * 		patch(b, diff(a, b)) === a
 * 		patch(a, reverse(diff(a, b)) === b
 * 		reverse(reverse(d)) === d
 */
export interface DeltaCalculator<Value, Delta> {
	diff(a: Value, b: Value): Delta;
	patch(a: Value, d: Delta): Value;
	reverse(delta: Delta): Delta;
}
