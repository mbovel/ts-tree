export class Bijection<A, B> {
	private readonly _aToB: Map<A, B> = new Map();
	private readonly _bToA: Map<B, A> = new Map();

	set(a: A, b: B): void {
		this._aToB.set(a, b);
		this._bToA.set(b, a);
	}

	clear(): void {
		this._aToB.clear();
		this._bToA.clear();
	}

	get aToB(): ReadonlyMap<A, B> {
		return this._aToB;
	}

	get bToA(): ReadonlyMap<B, A> {
		return this._bToA;
	}
}
