import { LittleEngine, isLittleEngine, SHADOW_ROOT } from './little-engine.js';

/*
	This function organizes a collection of LittleEngines into a tree, such that
	any LittleEngines which have ancestor-descendant relationships in the DOM
	will have the same ancestor-descendant relationships in the generated tree.
 */

export interface TreeNode {
	element: LittleEngine;
	children: TreeNode[];
}

export function createTree(elements: ReadonlySet<LittleEngine>): TreeNode[] {
	const memo: Map<LittleEngine, TreeNode> = new Map();
	const roots: TreeNode[] = [];

	for (const element of elements) {
		toTreeNode(element);
	}

	return roots;

	function toTreeNode(element: LittleEngine): TreeNode {
		let treeNode = memo.get(element);
		if (treeNode) {
			return treeNode;
		}

		treeNode = { element, children: [] };
		memo.set(element, treeNode);

		// We need to traverse our way up the DOM tree to find the closest
		// relevant ancestor, if there is one. If we find one, then this element
		// will become one of its children. Otherwise, this element is a root.
		const closestAncestorInSet = findAncestor(element, elements);
		if (closestAncestorInSet) {
			toTreeNode(closestAncestorInSet).children.push(treeNode);
		} else {
			roots.push(treeNode);
		}

		return treeNode;
	}
}

// Finds a node's closest ancestor that's in the given set of LittleEngines.
// ShadowRoots of LittleEngines are traversed as well.
function findAncestor(node: Node, matches: ReadonlySet<LittleEngine>): LittleEngine | null {
	let previous: Node = node;
	let ancestor: Node | null = node;

	findAncestor:
	for (; ancestor = ancestor.parentNode; previous = ancestor) {
		if (isLittleEngine(ancestor)) {
			// If we reached a LittleEngine without going through its
			// ShadowRoot, we need to see if we're actually inside one of its
			// slots, and then continue from there.
			const slotName = (previous as Element).slot;
			for (const slot of ancestor[SHADOW_ROOT]!.querySelectorAll('slot')) {
				if (slot.name === slotName) {
					ancestor = slot;
					continue findAncestor;
				}
			}
			if (matches.has(ancestor)) {
				return ancestor;
			}
		} else if (ancestor instanceof ShadowRoot) {
			ancestor = ancestor.host;
			if (matches.has(ancestor as any)) {
				return ancestor as Parameters<(typeof matches)['has']>[0];
			}
		}
	}

	return null;
}
