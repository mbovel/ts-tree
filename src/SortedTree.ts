import { Tree } from "./Tree";

export abstract class SortedTree extends Tree {
	/**
	 * If this.compare(that) < 0,  then this < that
	 * If this.compare(that) == 0, then this == that
	 * If this.compare(that) > 0,  then this > that
	 */
	abstract compare(that: this): number;

	appendChild(newTree: this): this {
		this.insertIn(this.children, newTree);
		return newTree;
	}

	// Inserts newTree somewhere after reference, though not necessarily right after.
	insertAfter(reference: this | undefined, newTree: this): this | undefined {
		if (!reference) return this.appendChild(newTree);
		if (reference.compare(newTree) > 0) throw Error("Cannot insert after larger element");
		if (this.hasChild(reference)) {
			return this.insertIn([reference, ...reference.nextSiblings()], newTree);
		}
	}

	// Inserts newTree somewhere before reference, though not necessarily right before.
	insertBefore(reference: this | undefined, newTree: this): this | undefined {
		if (!reference) return this.appendChild(newTree);
		if (reference.compare(newTree) < 0) throw Error("Cannot insert before smaller element");
		if (this.hasChild(reference)) {
			return this.insertIn([...reference.previousSiblings(), reference], newTree);
		}
	}

	protected insertIn(list: Iterable<this>, newTree: this): this {
		const firstLarger = this.children.find(child => child.compare(newTree) >= 0);
		if (firstLarger) {
			super.insertBefore(firstLarger, newTree);
		} else {
			super.appendChild(newTree);
		}
		return newTree;
	}
}
