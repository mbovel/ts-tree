export class Tree {
	private _parent?: this;
	private _children: this[] = [];

	get children(): ReadonlyArray<this> {
		return this._children;
	}

	get parent(): this | undefined {
		return this._parent;
	}

	get root(): this {
		return this._parent ? this._parent.root : this;
	}

	get nextSibling(): this | undefined {
		if (this._parent) return this._parent._children[this._parent._children.indexOf(this) + 1];
	}

	get previousSibling(): this | undefined {
		if (this._parent) return this._parent._children[this._parent._children.indexOf(this) - 1];
	}

	get firstChild(): this | undefined {
		return this._children[0];
	}

	get lastChild(): this | undefined {
		return this._children[this._children.length - 1];
	}

	get previous(): this | undefined {
		const previousSibling = this.previousSibling;
		if (previousSibling) return previousSibling.lastDescendant || previousSibling;
		return this._parent;
	}

	get lastDescendant(): this | undefined {
		const lastChild = this.lastChild;
		if (lastChild) return lastChild.lastDescendant || lastChild;
	}

	get next(): this | undefined {
		return this.firstChild || this.nextSibling || this.parentNext;
	}

	get parentNext(): this | undefined {
		if (this._parent) return this._parent.nextSibling || this._parent.parentNext;
	}

	after(newTree: this): this | undefined {
		if (this._parent) return this._parent.insertAfter(this, newTree);
	}

	before(newTree: this): this | undefined {
		if (this._parent) return this._parent.insertBefore(this, newTree);
	}

	remove(): this | undefined {
		if (this._parent) return this._parent.removeChild(this);
	}

	appendChild(newTree: this): this {
		newTree.reparent(this);
		this._children.push(newTree);
		return newTree;
	}

	push(...newTrees: this[]): number {
		newTrees.forEach((tree: this) => tree.reparent(this));
		this._children.push(...newTrees);
		return this._children.length;
	}

	insertAfter(reference: this | undefined, newTree: this): this | undefined {
		return this.insertBefore(reference ? reference.nextSibling : this.firstChild, newTree);
	}

	insertBefore(reference: this | undefined, newTree: this): this | undefined {
		if (!reference) return this.appendChild(newTree);
		if (this._children.includes(reference)) {
			newTree.reparent(this);
			this._children.splice(this._children.indexOf(reference), 0, newTree);
			return newTree;
		}
	}

	removeChild(child: this): this | undefined {
		const index = this._children.indexOf(child);
		if (index >= 0) {
			this._children.splice(index, 1);
			child._parent = undefined;
			return child;
		}
	}

	isBefore(that: this): number {
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

	isChildOf(that: this): boolean {
		if (this.parent === that) return true;
		if (this.parent) return this.parent.isChildOf(that);
		return false;
	}

	*childrenAfter(reference: this): Iterable<this> {
		const length = this._children.length;
		for (let i = this._children.indexOf(reference) + 1; i < length; ++i) {
			yield this._children[i];
		}
	}

	*childrenBefore(reference: this): Iterable<this> {
		for (let i = this._children.indexOf(reference) - 1; i >= 0; --i) {
			yield this._children[i];
		}
	}

	*previousSiblings(): Iterable<this> {
		if (this._parent) yield* this._parent.childrenBefore(this);
	}

	*nextSiblings(): Iterable<this> {
		if (this._parent) yield* this._parent.childrenAfter(this);
	}

	*descendants(): Iterable<this> {
		for (const child of this._children) {
			yield child;
			yield* child.descendants();
		}
	}

	*ancestors(): Iterable<this> {
		if (this._parent) {
			yield* this._parent.ancestors();
			yield this._parent;
		}
	}

	private reparent(newParent: this) {
		this.remove();
		this._parent = newParent;
	}
}
