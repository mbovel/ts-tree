export interface JSONTree<T> {
	value: T;
	children?: JSONTree<T>[];
}

export class Tree<T> {
	private _parent?: Tree<T>;
	private _children: Tree<T>[];

	constructor(public value: T, children: Tree<T>[] = []) {
		this._children = children;
		for (const child of children) {
			child.reparent(this);
		}
	}

	static fromJSON<T>(json: JSONTree<T>): Tree<T> {
		return new Tree(json.value, (json.children || []).map(Tree.fromJSON));
	}

	toJSON(): JSONTree<T> {
		if (this._children.length > 0) {
			return {
				value: this.value,
				children: this._children.map(child => child.toJSON())
			};
		}
		return { value: this.value };
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

	appendChild(newTree: Tree<T>): Tree<T> {
		newTree.reparent(this);
		this._children.push(newTree);
		return newTree;
	}

	push(...newTrees: Tree<T>[]): number {
		newTrees.forEach((tree: Tree<T>) => tree.reparent(this));
		this._children.push(...newTrees);
		return this._children.length;
	}

	insertAfter(reference: Tree<T> | undefined, newTree: Tree<T>): Tree<T> | undefined {
		return this.insertBefore(reference ? reference.nextSibling : this.firstChild, newTree);
	}

	insertBefore(reference: Tree<T> | undefined, newTree: Tree<T>): Tree<T> | undefined {
		if (!reference) return this.appendChild(newTree);
		const index = this._children.indexOf(reference);
		if (index >= 0) {
			newTree.reparent(this);
			this._children.splice(index, 0, newTree);
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

	isChildOf(that: Tree<T>): boolean {
		if (this.parent === that) return true;
		if (this.parent) return this.parent.isChildOf(that);
		return false;
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

	private reparent(newParent: Tree<T>) {
		this.remove();
		this._parent = newParent;
	}
}
