import * as assert from "assert";
import { Tree } from "../src/Tree";

describe("Tree", () => {
	function exampleTrees(): Tree[] {
		const trees: Tree[] = Array(10);
		trees[9] = new Tree();
		trees[8] = new Tree();
		trees[7] = new Tree();
		trees[7].push(trees[8], trees[9]);
		trees[6] = new Tree();
		trees[5] = new Tree();
		trees[4] = new Tree();
		trees[3] = new Tree();
		trees[3].push(trees[4]);
		trees[2] = new Tree();
		trees[2].push(trees[3]);
		trees[1] = new Tree();
		trees[1].push(trees[2]);
		trees[0] = new Tree();
		trees[0].push(trees[1], trees[5], trees[6]);
		return trees;
	}

	describe("#root", () => {
		it("returns itself if it is the root", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[0].root, trees[0]);
		});

		it("returns the first inclusive ancestor without parent", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[1].root, trees[0]);
			assert.strictEqual(trees[2].root, trees[0]);
		});
	});

	describe("#nextSibling", () => {
		it("returns the next sibling if there is one", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[5].nextSibling, trees[6]);
		});

		it("returns `undefined` there is no next sibling", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[6].nextSibling, undefined);
		});
	});

	describe("#previousSibling", () => {
		it("returns the previous sibling if there is one", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[5].previousSibling, trees[1]);
		});

		it("returns `undefined` if there is no previous sibling", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[1].previousSibling, undefined);
		});
	});

	describe("#firstChild", () => {
		it("returns the first child if there is one", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[0].firstChild, trees[1]);
		});

		it("returns `undefined` there is no first child", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[4].firstChild, undefined);
		});
	});

	describe("#lastChild", () => {
		it("returns the last child if there is one", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[0].lastChild, trees[6]);
		});

		it("returns `undefined` if there is no last child", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[4].lastChild, undefined);
		});
	});

	describe("#parent", () => {
		it("returns the parent tree if there is one", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[5].parent, trees[0]);
		});

		it("returns `undefined` if there is no parent tree", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[0].parent, undefined);
		});
	});

	describe("#previous", () => {
		it("returns the first preceding tree in tree order", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[6].previous, trees[5]);
			assert.strictEqual(trees[5].previous, trees[4]);
			assert.strictEqual(trees[1].previous, trees[0]);
			assert.strictEqual(trees[0].previous, undefined);
		});
	});

	describe("#next", () => {
		it("returns the first tree following in tree order", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[1].next, trees[2]);
			assert.strictEqual(trees[4].next, trees[5]);
			assert.strictEqual(trees[5].next, trees[6]);
			assert.strictEqual(trees[6].next, undefined);
		});
	});

	describe("#insertAfter", () => {
		it("returns undefined if `reference` node is not a child", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[1].insertAfter(trees[5], trees[7]), undefined);
		});

		it("returns the inserted node and sets its parent when sucessful", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[1].insertAfter(trees[2], trees[8]), trees[8]);
			assert.strictEqual(trees[2].nextSibling, trees[8]);
			assert.strictEqual(trees[1].firstChild, trees[2]);
			assert.strictEqual(trees[1].lastChild, trees[8]);
		});
	});

	describe("#removeChild", () => {
		it("returns undefined if `child` is not a child", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[1].removeChild(trees[4]), undefined);
		});

		it("returns the removed node and unsets its parent when sucessful", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[1].removeChild(trees[2]), trees[2]);
			assert.strictEqual(trees[1].children.length, 0);
			assert.strictEqual(trees[2].parent, undefined);
		});
	});

	describe("#isBefore()", () => {
		it("returns -1 if `this` preceeds `that` in tree order", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[3].isBefore(trees[6]), -1);
		});

		it("returns 1 if `this` follows `that` in tree order", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[6].isBefore(trees[5]), 1);
		});

		it("returns -1 if `this` is an ancestor of `that`", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[1].isBefore(trees[3]), -1);
		});

		it("returns 1 if `this` is a descendant of `that`", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[2].isBefore(trees[1]), 1);
		});

		it("returns 0 if `this === that`", () => {
			const trees = exampleTrees();
			assert.deepStrictEqual(trees[1], trees[1]);
		});

		it("returns 0 if `this` and `that` have different roots", () => {
			const trees = exampleTrees();
			assert.deepStrictEqual(trees[0].isBefore(trees[7]), 0);
		});
	});

	describe("#isChildOf()", () => {
		it("returns false if `this === that`", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[3].isChildOf(trees[3]), false);
		});

		it("returns false if `that` is not a parent of `this`", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[6].isChildOf(trees[5]), false);
			assert.strictEqual(trees[1].isChildOf(trees[2]), false);
		});

		it("returns true if `that` is a parent of that", () => {
			const trees = exampleTrees();
			assert.strictEqual(trees[3].isChildOf(trees[1]), true);
			assert.strictEqual(trees[2].isChildOf(trees[1]), true);
		});
	});
});
