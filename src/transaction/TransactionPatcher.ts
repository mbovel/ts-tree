import { Id, Operation, Transaction } from "./Transaction";
import { Serializer, TransactionableTree } from "./TransactionableTree";

export class TransactionPatcher<
	Delta,
	Serial,
	Tree extends TransactionableTree<Delta, Serial> = TransactionableTree<Delta, Serial>
> {
	constructor(
		private readonly trees: Map<Id, Tree>,
		private readonly serializer: Serializer<Serial, Tree>
	) {}

	apply(transaction: Transaction<Delta, Serial>): void {
		const getTree = (id: Id): Tree => {
			const tree = this.trees.get(id);
			if (!tree) {
				throw Error(`Tree ${id} could not be found in map ${[...this.trees.keys()]}`);
			}
			return tree;
		};

		const positionalTrees = (parent: Id, previousSibling: Id | undefined): [Tree, Tree?] => {
			return [getTree(parent), previousSibling ? getTree(previousSibling) : undefined];
		};

		for (const op of transaction) {
			switch (op.type) {
				case "insert": {
					const [parent, previousSibling] = positionalTrees(
						op.parent,
						op.previousSibling
					);
					const tree = this.serializer.deserialize(op.serialized);
					this.trees.set(tree.id, tree);
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
					if (node) {
						node.remove();
						this.trees.delete(node.id);
					} else {
						throw Error(
							"Inconsistent transaction: cannot remove node because node doesn't exist"
						);
					}
					break;
				}
				case "patch":
					getTree(op.tree).apply(op.delta);
					break;
				case "unpatch":
					getTree(op.tree).unapply(op.delta);
					break;
			}
		}
	}

	unapply(transaction: Transaction<Delta, Serial>): void {
		this.apply(transaction.map(op => this.reverse(op)).reverse());
	}

	reverse(op: Operation<Delta, Serial>): Operation<Delta, Serial> {
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
			case "patch":
				return { ...op, type: "unpatch" };
			case "unpatch":
				return { ...op, type: "patch" };
		}
	}
}
