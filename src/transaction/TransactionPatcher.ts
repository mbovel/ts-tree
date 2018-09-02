import { DeltaCalculator } from "./DeltaCalculator";
import { Operation, Transaction } from "./Transaction";
import { Indexer } from "./Indexer";
import { Tree } from "../Tree";

export class TransactionPatcher<Id, Value, Delta> {
	constructor(
		private readonly deltaCalculator: DeltaCalculator<Value, Delta>,
		private readonly indexer: Indexer<Value, Id>
	) {}

	apply(transaction: Transaction<Id, Value, Delta>): void {
		const optionalTree = (id: Id | undefined): Tree<Value> | undefined => id ? this.indexer.deindex(id) : undefined;
		for (const op of transaction) {
			switch (op.type) {
				case 'insert': {
					const parent = this.indexer.deindex(op.parent);
					const previousSibling = optionalTree(op.previousSibling);
					const tree = this.indexer.deindex(op.tree);
					parent.insertAfter(previousSibling, tree);
					break;
				}
				case 'move': {
					const tree = this.indexer.deindex(op.tree);
					const newParent = this.indexer.deindex(op.newParent);
					const newPreviousSibling = optionalTree(op.newPreviousSibling);
					newParent.insertAfter(newPreviousSibling, tree);
					break;
				}
				case 'remove': {
					const parent = this.indexer.deindex(op.parent);
					const tree = this.indexer.deindex(op.tree);
					if (op.previousSibling) {
						const previousSibling = this.indexer.deindex(op.previousSibling);
						const node = previousSibling.nextSibling;
						if (node && node.value === tree.value) {
							node.remove();
							break;
						} else if (!node) {
							throw Error('Inconsistent transaction: cannot remove node because there are no nodes after previousSibling');
						}
						throw Error(`Inconsistent transaction: cannot remove node because it does not have the expected value (expected ${tree.value}, has ${node.value})`);
					} else if (parent.firstChild) {
						if (parent.firstChild.value === tree.value) {
							parent.firstChild.remove();
							break;
						}
						throw Error(`Inconsistent transaction: cannot remove node because it does not have expected value (expected ${tree.value}, has ${parent.firstChild.value})`);
					}
					throw Error('Inconsistent transaction: cannot remove nonexistent node');
				}
				case 'change_value':
					const node = this.indexer.deindex(op.tree);
					node.value = this.deltaCalculator.patch(node.value, op.delta);
					break;
			}
		}
	}

	unapply(transaction: Transaction<Id, Value, Delta>): void {
		this.apply(transaction.map(op => this.reverse(op)).reverse());
	}

	reverse(op: Operation<Id, Value, Delta>): Operation<Id, Value, Delta> {
		switch (op.type) {
			case 'insert':
				return { ...op, type: 'remove' };
			case 'remove':
				return { ...op, type: 'insert' };
			case 'move':
				return {
					type: 'move',
					tree: op.tree,
					parent: op.newParent,
					previousSibling: op.newPreviousSibling,
					newParent: op.parent,
					newPreviousSibling: op.previousSibling,
				};
			case 'change_value':
				return {
					type: 'change_value',
					tree: op.tree,
					delta: this.deltaCalculator.reverse(op.delta)
				};
		}
	}
}
