export class Bijection<A, B> {
	private readonly _aToB: Map<A, B> = new Map();
	private readonly _bToA: Map<B, A> = new Map();

	set(a: A, b: B): void {
		this._aToB.set(a, b);
		this._bToA.set(b, a);
	}

	delete(a: A, b: B): boolean {
		return this._aToB.delete(a) && this._bToA.delete(b);
	}

	deleteA(a: A): boolean {
		const b = this._aToB.get(a);
		return b ? this.delete(a, b) : false;
	}

	deleteB(b: B): boolean {
		const a = this._bToA.get(b);
		return a ? this.delete(a, b) : false;
	}

	clear(): void {
		this._aToB.clear();
		this._bToA.clear();
	}

	get size(): number {
		return this._aToB.size;
	}

	get aToB(): ReadonlyMap<A, B> {
		return this._aToB;
	}

	get bToA(): ReadonlyMap<B, A> {
		return this._bToA;
	}
}
