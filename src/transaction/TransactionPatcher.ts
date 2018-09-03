import { Tree } from "../Tree";
import { Bijection } from "./Bijection";
import { DeltaCalculator } from "./DeltaCalculator";
import { Operation, Transaction } from "./Transaction";

export class TransactionPatcher<Id, Value, Delta> {
	constructor(
		private readonly deltaCalculator: DeltaCalculator<Value, Delta>,
		private readonly bijection: Bijection<Tree<Value>, Id>,
		private readonly generateId: () => Id
	) {}

	apply(transaction: Transaction<Id, Value, Delta>): void {
		const getTree = (id: Id): Tree<Value> => {
			const tree = this.bijection.bToA.get(id);
			if (!tree) throw Error("Tree not found in bijection");
			return tree;
		};

		const positionalTrees = (
			parent: Id,
			previousSibling: Id | undefined
		): [Tree<Value>, Tree<Value>?] => {
			return [getTree(parent), previousSibling ? getTree(previousSibling) : undefined];
		};

		for (const op of transaction) {
			switch (op.type) {
				case "insert": {
					const [parent, previousSibling] = positionalTrees(
						op.parent,
						op.previousSibling
					);
					const tree = new Tree(op.value);
					const id = op.restoreWithId || this.generateId();
					this.bijection.set(tree, id);
					parent.insertAfter(previousSibling, tree);
					break;
				}
				case "move": {
					const tree = getTree(op.tree);
					const [newParent, newPreviousSibling] = positionalTrees(
						op.newParent,
						op.newPreviousSibling
					);
					newParent.insertAfter(newPreviousSibling, tree);
					break;
				}
				case "remove": {
					const parent = getTree(op.parent);
					const node = op.previousSibling
						? getTree(op.previousSibling).nextSibling
						: parent.firstChild;
					if (node && node.value === op.value) {
						node.remove();
						op.restoreWithId = this.bijection.aToB.get(node) || this.generateId();
						this.bijection.deleteA(node);
					} else if (!node) {
						throw Error(
							"Inconsistent transaction: cannot remove node because node doesn't exist"
						);
					} else {
						throw Error(
							`Inconsistent transaction: cannot remove node because it does not have the expected value (expected ${
								op.value
							}, has ${node.value})`
						);
					}
					break;
				}
				case "change_value": {
					const tree = getTree(op.tree);
					tree.value = this.deltaCalculator.patch(tree.value, op.delta);
					break;
				}
			}
		}
	}

	unapply(transaction: Transaction<Id, Value, Delta>): void {
		this.apply(transaction.map(op => this.reverse(op)).reverse());
	}

	reverse(op: Operation<Id, Value, Delta>): Operation<Id, Value, Delta> {
		switch (op.type) {
			case "insert":
				return { ...op, type: "remove" };
			case "remove":
				return { ...op, type: "insert" };
			case "move":
				return {
					type: "move",
					tree: op.tree,
					parent: op.newParent,
					previousSibling: op.newPreviousSibling,
					newParent: op.parent,
					newPreviousSibling: op.previousSibling
				};
			case "change_value":
				return {
					type: "change_value",
					tree: op.tree,
					delta: this.deltaCalculator.reverse(op.delta)
				};
		}
	}
}
