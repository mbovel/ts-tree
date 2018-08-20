export class Tree<T> {
	private _parent: Tree<T> | undefined;

	constructor(public value: T, private _children: Tree<T>[] = []) {
		for (const child of _children) {
			child.remove();
			child._parent = this;
		}
	}

	get children(): ReadonlyArray<Tree<T>> {
		return this._children;
	}

	get parent(): Tree<T> | undefined {
		return this._parent;
	}

	get root(): Tree<T> {
		return this._parent ? this._parent.root : this;
	}

	get nextSibling(): Tree<T> | undefined {
		if (this._parent) return this._parent._children[this._parent._children.indexOf(this) + 1];
	}

	get previousSibling(): Tree<T> | undefined {
		if (this._parent) return this._parent._children[this._parent._children.indexOf(this) - 1];
	}

	get firstChild(): Tree<T> | undefined {
		return this._children[0];
	}

	get lastChild(): Tree<T> | undefined {
		return this._children[this._children.length - 1];
	}

	get previous(): Tree<T> | undefined {
		const previousSibling = this.previousSibling;
		if (previousSibling) return previousSibling.lastDescendant || previousSibling;
		return this._parent;
	}

	get lastDescendant(): Tree<T> | undefined {
		const lastChild = this.lastChild;
		if (lastChild) return lastChild.lastDescendant || lastChild;
	}

	get next(): Tree<T> | undefined {
		return this.firstChild || this.nextSibling || this.parentNext;
	}

	get parentNext(): Tree<T> | undefined {
		if (this._parent) return this._parent.nextSibling || this._parent.parentNext;
	}

	after(newTree: Tree<T>): Tree<T> | undefined {
		if (this._parent) return this._parent.insertAfter(this, newTree);
	}

	before(newTree: Tree<T>): Tree<T> | undefined {
		if (this._parent) return this._parent.insertBefore(this, newTree);
	}

	remove(): Tree<T> | undefined {
		if (this._parent) return this._parent.removeChild(this);
	}

	appendChild(newTree: Tree<T>): Tree<T> | undefined {
		return this.insertBefore(undefined, newTree);
	}

	insertAfter(reference: Tree<T> | undefined, newTree: Tree<T>): Tree<T> | undefined {
		return this.insertBefore(reference ? reference.nextSibling : this.firstChild, newTree);
	}

	insertBefore(reference: Tree<T> | undefined, newTree: Tree<T>): Tree<T> | undefined {
		const index = reference ? this._children.indexOf(reference) : this._children.length;
		if (index >= 0) {
			newTree.remove();
			this._children.splice(index, 0, newTree);
			newTree._parent = this;
			return newTree;
		}
	}

	removeChild(child: Tree<T>): Tree<T> | undefined {
		const index = this._children.indexOf(child);
		if (index >= 0) {
			this._children.splice(index, 1);
			child._parent = undefined;
			return child;
		}
	}

	isBefore(that: Tree<T>): number {
		if (this === that) return 0;
		const thisAncestors = [...this.ancestors(), this];
		const thatAncestors = [...that.ancestors(), that];
		const minLength = Math.min(thisAncestors.length, thatAncestors.length);
		for (let i = 0; i < minLength; ++i) {
			const thisAncestor = thisAncestors[i];
			const thatAncestor = thatAncestors[i];
			if (thisAncestor !== thatAncestor) {
				const lowestCommonAncestor = thisAncestors[i]._parent;
				if (!lowestCommonAncestor) return 0;
				const siblings = lowestCommonAncestor._children;
				return siblings.indexOf(thisAncestor) < siblings.indexOf(thatAncestor) ? -1 : 1;
			}
		}
		return thisAncestors.length < thatAncestors.length ? -1 : 1;
	}

	sortChildren(fn: (a: T, b: T) => number): void {
		this._children.sort((a, b) => fn(a.value, b.value));
	}

	clone(): Tree<T> {
		return new Tree(this.value, this._children.map(_ => _.clone()));
	}

	*childrenAfter(reference: Tree<T>): Iterable<Tree<T>> {
		const length = this._children.length;
		for (let i = this._children.indexOf(reference) + 1; i < length; ++i) {
			yield this._children[i];
		}
	}

	*childrenBefore(reference: Tree<T>): Iterable<Tree<T>> {
		for (let i = this._children.indexOf(reference) - 1; i >= 0; --i) {
			yield this._children[i];
		}
	}

	*previousSiblings(): Iterable<Tree<T>> {
		if (this._parent) yield* this._parent.childrenBefore(this);
	}

	*nextSiblings(): Iterable<Tree<T>> {
		if (this._parent) yield* this._parent.childrenAfter(this);
	}

	*descendants(): Iterable<Tree<T>> {
		for (const child of this._children) {
			yield child;
			yield* child.descendants();
		}
	}

	*ancestors(): Iterable<Tree<T>> {
		if (this._parent) {
			yield* this._parent.ancestors();
			yield this._parent;
		}
	}
}
