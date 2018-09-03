import * as assert from "assert";
import { Tree } from "../src/Tree";
import { DeltaCalculator } from "../src/transaction/DeltaCalculator";
import { TransactionBuilder } from "../src/transaction/TransactionBuilder";
import { TransactionPatcher } from "../src/transaction/TransactionPatcher";
import { exampleTrees, randomInt, uid, uniformly } from "./utils";
import { Transaction } from "../src/transaction/Transaction";
import { Bijection } from "../src/transaction/Bijection";

type TestTransaction = Transaction<string, number, number>;

const delta: DeltaCalculator<number, number> = {
	diff(a: number, b: number): number {
		return a - b;
	},
	patch(a: number, d: number): number {
		return a + d;
	},
	reverse(delta: number): number {
		return -delta;
	}
};

describe("Transaction", () => {
	const bijection = new Bijection<Tree<number>, string>();

	let root: Tree<number>,
		builder: TransactionBuilder<string, number, number>,
		patcher: TransactionPatcher<string, number, number>;

	beforeEach('reset', () => {
		bijection.clear();
		root = exampleTrees()[0];
		bijection.set(root, uid());
		builder = new TransactionBuilder(delta, bijection, uid);
		patcher = new TransactionPatcher(delta, bijection);
	});


	// These tests are just to verify that the constraints are indeed being respected.
	describe("DeltaCalculator", () => {
		const n = 100;
		it("holds for identity patch(b, diff(a, b)) === a", () => {
			for (let i = 0; i < n; ++i) {
				const a = randomInt();
				const b = randomInt();
				assert.strictEqual(delta.patch(b, delta.diff(a, b)), a);
			}
		});

		it("holds for identity patch(a, reverse(diff(a, b)) === b", () => {
			for (let i = 0; i < n; ++i) {
				const a = randomInt();
				const b = randomInt();
				assert.strictEqual(delta.patch(a, delta.reverse(delta.diff(a, b))), b);
			}
		});

		it("holds for identity reverse(reverse(d)) === d", () => {
			for (let i = 0; i < n; ++i) {
				const d = randomInt();
				assert.strictEqual(delta.reverse(delta.reverse(d)), d);
			}
		});
	});

	describe("TransactionBuilder", () => {
		it("is reusable", () => {
			// Transaction containing insert:
			builder.insert(root, undefined, 2);
			patcher.apply(builder.commit());
			const firstResult = root.clone();

			// Supposedly empty transaction:
			patcher.apply(builder.commit());

			assert.deepStrictEqual(root, firstResult);
		});

		describe("#insert", () => {
			it("throws an error when inserting both after and under same node", () => {
				const tree = new Tree(1);
				assert.throws(() => {
					builder.insert(tree, tree, 1);
				});
			});
		});

		describe("#remove", () => {
			it("throws an error when removing", () => {
				// TODO
			});
		});
	});

	describe("TransactionPatcher", () => {
		function applyRandom(tree: Tree<number>, nOps: number): TestTransaction[] {
			const transactions = [];
			for (let i = 0; i < nOps; ++i) {
				if (tree.children.length > 0) {
					const child = uniformly<Tree<number>>(...tree.children);
					const otherChildren = tree.children.filter(c => c !== child);
					const previousSibling = uniformly(undefined, ...otherChildren);
					uniformly(
						() => builder.insert(tree, previousSibling, randomInt()),
						// () => builder.remove(child),
						() => builder.move(child, tree, previousSibling),
						// () => builder.changeValue(child, randomInt())
					);
				} else {
					builder.insert(tree, undefined, randomInt());
				}

				const transaction = builder.commit();
				transactions.push(transaction);
				patcher.apply(transaction);
			}
			return transactions;
		}

		// This test is useful to automatically check for bugs.
		// The tests below are more minimal test cases meant to target specific
		// potential problems that were found during initial development.
		it("can apply and unapply many randomly generated transactions", () => {
			const original = root.clone();
			const transactions = applyRandom(root, 100);
			const endTree = root.clone();
			transactions.slice().reverse().forEach((transaction, i, all) => {
				try {
					patcher.unapply(transaction);
				} catch (e) {
					console.error(
						"UNAPPLY TRANSACTION",
						i,
						"FAILED:",
						transaction.map(patcher.reverse)
					);
					console.log('end/start tree:', endTree.toJSON());
					console.log('current tree:', root.toJSON());
					console.log('All applied transactions', transactions);
					console.log('All unapplied transactions', all.slice(0, i + 1));
					throw e;
				}
			});

			assert.deepStrictEqual(root, original);
		});

		it("can apply and unapply simple insert and remove", () => {
			const child1 = new Tree(1);
			const child2 = new Tree(2);
			const tree = new Tree(0, [child1, child2]);
			const original = tree.clone();

			builder.insert(tree, child2, 3);
			const transaction1 = builder.commit();
			patcher.apply(transaction1);

			builder.remove(child2);
			const transaction2 = builder.commit();
			patcher.apply(transaction2);

			patcher.unapply(transaction2);
			patcher.unapply(transaction1);

			assert.deepStrictEqual(tree, original);
		});
	});
});
