import { Tree } from "../Tree";

export interface Indexer<Value, Id> {
	index(tree: Tree<Value>): Id;
	deindex(id: Id): Tree<Value>;
}
