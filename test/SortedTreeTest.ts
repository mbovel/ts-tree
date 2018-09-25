import * as assert from "assert";
import { SortedTree } from "../src/SortedTree";

class TestTree extends SortedTree {
	constructor(public value: number) {
		super();
	}

	compare(that: this): number {
		return this.value - that.value;
	}
}

describe("SortedTree", () => {
	/**
	 *  0
	 *  +--1
	 *  |  +--2
	 *  |     +--3
	 *  |        +--4
	 *  +--5
	 *  +--6
	 *
	 *  7
	 *  +--8
	 *  +--9
	 */
	function exampleTrees(): TestTree[] {
		const trees: TestTree[] = Array(10);
		trees[9] = new TestTree(9);
		trees[8] = new TestTree(8);
		trees[7] = new TestTree(7);
		trees[7].push(trees[8], trees[9]);
		trees[6] = new TestTree(6);
		trees[5] = new TestTree(5);
		trees[4] = new TestTree(4);
		trees[3] = new TestTree(3);
		trees[3].push(trees[4]);
		trees[2] = new TestTree(2);
		trees[2].push(trees[3]);
		trees[1] = new TestTree(1);
		trees[1].push(trees[2]);
		trees[0] = new TestTree(0);
		trees[0].push(trees[1], trees[5], trees[6]);
		return trees;
	}

	function isSorted(tree: TestTree): boolean {
		const childrenSorted = tree.children.every(
			child => (child.nextSibling ? child.compare(child.nextSibling) <= 0 : true)
		);
		return childrenSorted && tree.children.every(isSorted);
	}

	it("is sorted when empty", () => {
		assert(isSorted(new TestTree(0)));
	});

	describe("#push", () => {
		it("preserves sort order", () => {
			// exampleTrees uses push internally, so we're relying on that
			const trees = exampleTrees();
			assert(isSorted(trees[0]));
			assert(isSorted(trees[7]));
		});
	});

	describe("#appendChild", () => {
		it("preserves sort order", () => {
			const tree = exampleTrees()[0];
			for (let i = -10; i < 10; ++i) {
				tree.appendChild(new TestTree(i));
			}
			assert(isSorted(tree));
		});
	});

	describe("#insertBefore", () => {
		it("preserves sort order", () => {
			const tree = exampleTrees()[0];
			for (let i = -10; i < 10; ++i) {
				tree.insertBefore(undefined, new TestTree(i));
			}
			assert(isSorted(tree));
		});

		it("returns undefined if `reference` node is not a child", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[1].insertAfter(trees[5], trees[7]), undefined);
		});
	});

	describe("#insertAfter", () => {
		it("preserves sort order", () => {
			const tree = exampleTrees()[0];
			for (let i = -10; i < 10; ++i) {
				tree.insertAfter(undefined, new TestTree(i));
			}
			assert(isSorted(tree));
		});
	});
});
