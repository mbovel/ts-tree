import { Tree } from "../Tree";

export interface TransactionableTree<Delta, Serial> extends Tree {
	readonly id: number | string;
	diff(that: this): Delta; // must not change id or children
	apply(delta: Delta): void; // must not change id or children
	unapply(delta: Delta): void; // must not change id or children
}

export interface Serializer<Serial, T> {
	serialize(t: T): Serial;
	deserialize(serial: Serial): T;
}
