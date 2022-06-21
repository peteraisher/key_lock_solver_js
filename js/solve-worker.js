
class Vector3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    subScalar(s) {
        this.x -= s;
        this.y -= s;
        this.z -= s;
    }

    add(other) {
        this.x += other.x;
        this.y += other.y;
        this.z += other.z;
    }

    subVectors(a, b) {
        this.x = a.x - b.x;
        this.y = a.y - b.y;
        this.z = a.z - b.z;
    }

    equals(other) {
        return this.x === other.x && this.y === other.y && this.z === other.z;
    }

    min(other) {
        this.x = other.x < this.x ? other.x : this.x;
        this.y = other.y < this.y ? other.y : this.y;
        this.z = other.z < this.z ? other.z : this.z;
    }

    max(other) {
        this.x = other.x > this.x ? other.x : this.x;
        this.y = other.y > this.y ? other.y : this.y;
        this.z = other.z > this.z ? other.z : this.z;
    }

    allGreaterThan(other) {
        return this.x > other.x && this.y > other.y && this.z > other.z;
    }
    allGreaterThanOrEqual(other) {
        return this.x >= other.x && this.y >= other.y && this.z >= other.z;
    }
}

class Box3 {
    constructor(min = new Vector3(Infinity, Infinity, Infinity),
                max = new Vector3(-Infinity, -Infinity, -Infinity)) {
        this.min = min;
        this.max = max;
    }
    expandByPoint(point) {
        this.min.min(point);
        this.max.max(point);
    }
    clone() {
        return new Box3(this.min.clone(), this.max.clone());
    }
    translate(offset) {
        this.min.add(offset);
        this.max.add(offset);
    }
    intersectsBox(other) {
        return this.max.allGreaterThanOrEqual(other.min) && other.max.allGreaterThanOrEqual(this.min);
    }
}

class PuzzleState {
    constructor() {
        this.storage = 0x888888888888888888888888888n;
    }

    static fromFlattened(other) {
        let result = new PuzzleState();
        result.storage = other.storage;
        return result;
    }

    isRemoved(i) {
        return !!((this.storage >> BigInt(108 + i)) & 1n);
    }

    removePiece(i) {
        this.storage |= (1n << BigInt(108 + i));
    }

    canRemove(i) {
        let enc = (this.storage >> BigInt(12 * i)) & 0xfffn;
        let componentOffset = BigInt(i & ~0x3);
        enc >>= componentOffset;
        enc &= 0xfn;
        return (enc == 0x1n || enc == 0xfn);
    }

    distanceToRemove(i) {
        if (this.isRemoved(i)) {
            return 0;
        }
        let enc = (this.storage >> BigInt(12 * i)) & 0xfffn;
        let componentOffset = BigInt(i & ~0x3);
        enc >>= componentOffset;
        enc &= 0xfn;
        if (enc > 8n) {
            enc = 16n - enc;
        }
        return Number(enc);
    }

    removedCount() {
        let tot = 0;
        let enc = this.storage >> 108n;
        // pop count 9 bits
        enc = enc - ((enc >> 1n) & 0x55n);
        enc = (enc & 0x133n) + ((enc >> 2n) & 0x33n);
        enc = (enc + (enc >> 4n)) & 0x10fn;
        enc = (enc + (enc >> 8n)) & 0xfn;
        return enc;
    }

    getPosition(i) {
        let enc = (this.storage >> BigInt(12 * i)) & 0xfffn;
        const x = (enc & 0xfn) - 8n; enc >>= 4n;
        const y = (enc & 0xfn) - 8n; enc >>= 4n;
        const z = enc          - 8n;
        return new Vector3(Number(x), Number(y), Number(z));
    }

    movePosition(i, diff) {
        let offset = 0n;
        let value = 0;
        if (!!diff.x) {
            value = diff.x;
        } else if (!!diff.y) {
            value = diff.y;
            offset = 4n;
        } else {
            value = diff.z;
            offset = 8n;
        }
        const change = 1n << (BigInt(12 * i) + offset);
        if (value > 0) {
            this.storage += change;
        } else {
            this.storage -= change;
        }
    }

    toString() {
        let result = '';
        let enc = this.storage;
        for (let piece = 0; piece < 9; piece++) {
            let tmp = '';
            if (this.isRemoved(piece)) {
                tmp = '_';
                enc >>= 12n;
            } else {
                for (let i = 0; i < 3; i++) {
                    if (tmp) {
                        tmp = tmp + ', ';
                    }
                    tmp = tmp + ((enc & 0xfn) - 8n).toString();
                    enc >>= 4n;
                }
            }
            tmp = '(' + tmp + ')';
            if (result) {
                result = result + ', ';
            }
            result = result + tmp;
        }
        result = 'PuzzleState {positions: [' + result + ']}';
        return result;
    }

    equals(other) {
        return this.storage === other.storage;
    }

    clone() {
        let result = new PuzzleState();
        result.storage = this.storage;
        return result;
    }

    static solved() {
        let result = new PuzzleState();
        result.storage |= (0x1ffn << 108n);
        return result;
    }
}

class Volume {
    constructor(components) {
        this.boundingBox = new Box3()
        this.points = new Array();
        this.pointsSet = new Set();
        const toPrimitive = (p) => {
            return (p.x + 8)
                + ((p.y + 8) << 5)
                + ((p.z + 8) << 10);
        }
        for (let i = 0; i < components.length; i += 3) {
            const point = new Vector3(components[i], components[i+1], components[i+2]);
            this.points.push(point);
            this.pointsSet.add(toPrimitive(point));
            this.boundingBox.expandByPoint(point);
        }
    }

    boundingBoxIntersects(other, offset) {
        const moved = this.boundingBox.clone();
        moved.translate(offset);
        return moved.intersectsBox(other.boundingBox);
    }

    pointsIntersect(other, offset) {
        let offsetPrimitive = (p) => {
            return (p.x + offset.x + 8)
                + ((p.y + offset.y + 8) << 5)
                + ((p.z + offset.z + 8) << 10);
        }
        for (let point of this.points.values()) {
            if (other.pointsSet.has(offsetPrimitive(point))) {
                return true;
            }
        }
        return false;
    }

}

const movablePieces = [
    new Volume([    // A
        0,3,4, 0,3,5, 0,4,4, 0,4,5, 0,5,4, 0,5,5,
        1,3,4, 1,5,4,
        2,5,4, 2,5,5,
        3,5,4,
        4,5,4,
        5,3,4, 5,5,4,
        6,3,4, 6,3,5, 6,4,4, 6,4,5, 6,5,4, 6,5,5
    ]),
    new Volume([    // B
        0,1,3, 0,1,4, 0,1,5, 0,2,3, 0,2,4, 0,2,5,
        1,1,3, 1,1,4, 1,2,3, 1,2,4,
        2,2,3, 2,2,4,
        3,2,3,
        4,2,3,
        5,2,3,
        6,1,3, 6,1,4, 6,1,5, 6,2,3, 6,2,4, 6,2,5
    ]),
    new Volume([    // C
        0,1,1, 0,1,2, 0,2,1, 0,2,2, 0,3,1, 0,3,2,
        1,1,2, 1,2,2,
        2,1,2,
        3,1,2,
        4,1,2,
        5,1,2, 5,2,2,
        6,1,1, 6,1,2, 6,2,1, 6,2,2, 6,3,1, 6,3,2
    ]),
    new Volume([    // D
        0,4,1, 0,4,2, 0,4,3, 0,5,1, 0,5,2, 0,5,3,
        1,4,3,
        2,4,3,
        3,4,3,
        4,4,3,
        5,4,3,
        6,4,1, 6,4,2, 6,4,3, 6,5,1, 6,5,2, 6,5,3
    ]),
    new Volume([    // E
        1,0,4, 1,0,5, 1,1,5, 1,2,5, 1,3,5, 1,4,5, 1,5,5, 1,6,4, 1,6,5,
        2,0,4, 2,0,5, 2,6,4, 2,6,5,
        3,0,4, 3,0,5, 3,1,4, 3,1,5, 3,6,4, 3,6,5
    ]),
    new Volume([    // F
        4,0,3, 4,0,4, 4,0,5, 4,1,5, 4,2,5, 4,3,5, 4,4,5, 4,5,5, 4,6,3, 4,6,4, 4,6,5,
        5,0,3, 5,0,4, 5,0,5, 5,6,3, 5,6,4, 5,6,5
    ]),
    new Volume([    // G
        3,0,1, 3,0,2, 3,1,1, 3,5,1, 3,5,2, 3,6,1, 3,6,2,
        4,0,1, 4,0,2, 4,1,1, 4,2,1, 4,6,1, 4,6,2,
        5,0,1, 5,0,2, 5,1,1, 5,2,1, 5,3,1, 5,4,1, 5,5,1, 5,6,1, 5,6,2
    ]),
    new Volume([    // H
        1,0,1, 1,0,2, 1,0,3, 1,6,1, 1,6,2, 1,6,3,
        2,0,1, 2,0,2, 2,0,3, 2,1,1, 2,2,1, 2,3,1,
        2,4,1, 2,5,1, 2,5,3, 2,6,1, 2,6,2, 2,6,3
    ]),
    new Volume([    // K
        3,2,0, 3,2,4, 3,2,5, 3,2,6, 3,2,10, 3,2,11, 3,2,12, 3,3,0, 3,3,2, 3,3,3,
        3,3,4, 3,3,6, 3,3,7, 3,3,8, 3,3,9, 3,3,10, 3,3,12,
        3,4,0, 3,4,1, 3,4,2, 3,4,4, 3,4,6, 3,4,10, 3,4,11, 3,4,12
    ])
];

class SearchNode {
    constructor(state, parent, cost, heuristic) {
        this.state = state;
        this.parent = parent;
        this.cost = cost;
        this.heuristic = heuristic;
    }

    equals(other) {
        return this.state.equals(other.state)
            && this.parent.state.equals(other.parent.state)
            && this.cost === other.cost
            && this.heuristic === other.heuristic;
    }

    lessThan(other) {
        return this.cost + this.heuristic < other.cost + other.heuristic;
    }
}

class NodePriorityQueue {

    static Sentinel = class Sentinel {
        constructor() {

        }

        lessThan(other) {
            return true;
        }
    }
    constructor() {
        this.storage = new Array();
        this.storage.push(new NodePriorityQueue.Sentinel());
    }

    static #parent(idx) {
        return idx >> 1;
    }

    static #leftChild(idx) {
        return idx << 1;
    }

    static #rightChild(idx) {
        return (idx << 1) + 1;
    }

    #bubbleUp(idx, value) {
        let parentIdx = NodePriorityQueue.#parent(idx);
        while (!this.storage[parentIdx].lessThan(value)) {
            this.storage[idx] = this.storage[parentIdx];
            idx = parentIdx;
            parentIdx = NodePriorityQueue.#parent(idx);
        }
        this.storage[idx] = value;
    }

    #bubbleDown(idx, value) {
        let childIdx = NodePriorityQueue.#leftChild(idx);
        while (childIdx < this.storage.length) {
            const nextChildIdx = childIdx + 1;
            if (nextChildIdx < this.storage.length &&
                !this.storage[childIdx].lessThan(this.storage[nextChildIdx])) {
                childIdx = nextChildIdx;
            }
            if (this.storage[childIdx].lessThan(value)) {
                this.storage[idx] = this.storage[childIdx];
                idx = childIdx;
                childIdx = NodePriorityQueue.#leftChild(childIdx);
            } else {
                break;
            }
        }
        this.storage[idx] = value;
    }

    push(value) {
        let idx = this.storage.length;
        this.storage.push(value)
        this.#bubbleUp(idx, value);
    }

    isEmpty() {
        return this.storage.length == 1;
    }

    pop() {
        if (this.isEmpty()) {
            return null
        } else if (this.storage.length == 2) {
            return this.storage.pop();
        }
        let result = this.storage[1];
        let value = this.storage.pop();
        this.#bubbleDown(1, value);
        return result;
    }
}

const CacheValue = {
    CollisionFlag:  0b01,
    StoredFlag:     0b10,
    NotStored:      0b00,
    NoCollision:    0b10,
    Collision:      0b11
}

Object.freeze(CacheValue);

class CollisionCache {

    constructor() {
        this.buffer = new ArrayBuffer(43200);
        this.storage = new Uint32Array(this.buffer);
    }

    #getValue(index) {
        return (this.storage[index.index] >> index.bitOffset) & 0x3;
    }

    #setValue(index, value) {
        this.storage[index.index] |= value << index.bitOffset;
    }

    #cacheIndex(pairIndex, offset) {
        let offsetIndex = (offset.x + 7)
                        + ((offset.y + 7) << 4)
                        + ((offset.z + 7) << 8);
        let totalIndex = pairIndex * (15 << 8) + offsetIndex;
        return {
            index: totalIndex >> 4,
            bitOffset: (totalIndex & 0xf) << 1
        }
    }

    #pairIndex(a, b) {
        return (((15 - a) * a) >> 1) + (b - 1);
    }

    #boxPairIndex(a) {
        return 36 + a;
    }

    boxCacheValue(a, offset) {
        let p = this.#boxPairIndex(a);
        let index = this.#cacheIndex(p, offset);
        return this.#getValue(index);
    }

    setBoxCacheValue(a, offset, value) {
        let p = this.#boxPairIndex(a);
        let index = this.#cacheIndex(p, offset);
        this.#setValue(index, value);
    }

    cacheValue(a, b, offset) {
        let p = this.#pairIndex(a, b);
        let index = this.#cacheIndex(p, offset);
        return this.#getValue(index);
    }

    setCacheValue(a, b, offset, value) {
        let p = this.#pairIndex(a, b);
        let index = this.#cacheIndex(p, offset);
        this.#setValue(index, value);
    }

}

class AStarSolver {
    constructor() {
        this.collisionCache = new CollisionCache();
        this.#buildBox();
    }

    #buildBox() {
        let boxPoints = new Array();
        for (let z = 0; z < 7; z += 6) {
            for (let x = 0; x < 7; x++) {
                if (x == 3) {
                    boxPoints.push(x, 0, z, x, 1, z, x, 5, z, x, 6, z);
                } else {
                    for (let y = 0; y < 7; y++) {
                        boxPoints.push(x, y, z);
                    }
                }
            }
        }
        for (let z = 1; z < 6; z++) {
            boxPoints.push(0, 0, z, 0, 6, z, 6, 0, z, 6, 6, z);
        }
        this.box = new Volume(boxPoints);
    }

    #cascadeMove(index, move, state, moved) {
        let startPos = state.getPosition(index);
        let newPos = startPos.clone()
        newPos.add(move);
        if (this.#boxCollision(index, newPos)) {
            return 0;
        }
        state.movePosition(index, move);
        moved[index] = true;

        let tot = 0;
        for (let i = 0; i < 9; i++) {
            if (index == i
                || state.isRemoved(i)
                || !this.#haveCollision(index, i, newPos, state.getPosition(i))) {
                continue;
            }
            let res = this.#cascadeMove(i, move, state, moved)
            if (res == 0) {
                return 0;
            }
            tot += res;
        }
        return tot + 1;
    }

    #boxCollision(index, offset) {
        return movablePieces[index].pointsIntersect(this.box, offset);
        // skip cache.

        let cv = this.collisionCache.boxCacheValue(index, offset);
        if (cv != CacheValue.NotStored) {
            return cv == CacheValue.Collision;
        }
        let result = movablePieces[index].pointsIntersect(this.box, offset);
        cv = result ? CacheValue.Collision : CacheValue.NoCollision;
        this.collisionCache.setBoxCacheValue(index, offset, cv);
    }

    #haveCollision(firstIndex, secondIndex,
                   firstPosition, secondPosition) {
        let offset = new Vector3();
        if (secondIndex < firstIndex) {
            let t = firstIndex;
            firstIndex = secondIndex;
            secondIndex = t;
            offset.subVectors(secondPosition, firstPosition);
        } else {
            offset.subVectors(firstPosition, secondPosition);
        }

        if (!movablePieces[firstIndex].boundingBoxIntersects(movablePieces[secondIndex], offset)) {
            return false;
        }

        return movablePieces[firstIndex].pointsIntersect(movablePieces[secondIndex], offset);

        if (Math.max(Math.abs(offset.x), Math.abs(offset.y), Math.abs(offset.z)) >= 7) {
            return false;
        }
        let cv = this.collisionCache.cacheValue(firstIndex, secondIndex, offset);
        if (cv != CacheValue.NotStored) {
            return cv == CacheValue.Collision;
        }
        let firstBody = /*this.*/movablePieces[firstIndex];
        let secondBody = /*this.*/movablePieces[secondIndex];
        let result = firstBody.boundingBoxIntersects(secondBody, offset);
        if (!result) {
            this.collisionCache.setCacheValue(firstIndex, secondIndex, offset, CacheValue.NoCollision);
            return false;
        }
        result = firstBody.pointsIntersect(secondBody, offset);
        cv = result ? CacheValue.Collision : CacheValue.NoCollision;
        this.collisionCache.setCacheValue(firstIndex, secondIndex, offset, cv);
        return result;
    }

    #possibleMoves(state) {
        let result = new Array();
        let moves = [
            new Vector3( 1, 0, 0),
            new Vector3(-1, 0, 0),
            new Vector3(0,  1, 0),
            new Vector3(0, -1, 0),
            new Vector3(0, 0,  1),
            new Vector3(0, 0, -1)
        ];
        for (let i = 0; i < 9; i++) {
            if (state.isRemoved(i)) {
                continue;
            }

            if (state.canRemove(i)) {
                let stateCopy = state.clone();
                stateCopy.removePiece(i);
                result.push({
                    state: stateCopy,
                    cost: 0
                });
            }
            for (let move of moves) {
                let stateCopy = state.clone();
                let moved = new Array();
                for (let p = 0; p < 9; p++) {
                    moved.push(false);
                }
                let res = this.#cascadeMove(i, move, stateCopy, moved);
                if (res) {
                    let cost = Math.sqrt(res);
                    result.push({
                        state: stateCopy,
                        cost: cost
                    });
                }
            }
        }
        return result;
    }

    #backtrack(goalNode) {
        let result = new Array();
        let node = goalNode;
        while (node.parent != null) {
            result.push(node.state);
            node = node.parent;
        }
        result.push(node.state);
        return result;
    }


    #search(initialState, goalTestFunction, successorFunction, heuristicFunction) {
        const frontier = new NodePriorityQueue();
        const explored = new Map();
        const start = new SearchNode(initialState, null, 0, heuristicFunction(initialState));

        frontier.push(start);
        explored.set(initialState.storage, 0);
        while (!frontier.isEmpty()) {
            const currentNode = frontier.pop();
            const currentState = currentNode.state;
            if (goalTestFunction(currentState)) {
                return this.#backtrack(currentNode);
            }

            for (let pair of successorFunction(currentState)) {
                const child = pair.state;
                const newCost = currentNode.cost + pair.cost;
                if (!explored.has(child.storage) || explored.get(child.storage) > newCost) {
                    explored.set(child.storage, newCost);
                    const childNode =
                        new SearchNode(child, currentNode, newCost, heuristicFunction(child));
                    frontier.push(childNode);
                }
            }
        }
        return [];
    }

    #printSolution(solution, start) {
        console.log('printSolution');
        for (let state of solution) {
            console.log(state.toString());
        }
    }

    solve(state = new PuzzleState()) {
        var lastSolveState = state;
        let totalSolution = [state];

        let successorFunction = (s) => {
            return this.#possibleMoves(s);
        }

        let heuristicFunction = (s) => {
            let result = 0;
            for (let i = 0; i < 9; i++) {
                result += s.distanceToRemove(i);
            }
            return result;
        }

        for (let i = state.removedCount(); i < 9; i++) {
            console.log('solving, step ' + (i+1n));
            let goalTestFunction = (s) => {
                return s.removedCount() > i;
            }
            let solution = this.#search(lastSolveState, goalTestFunction,
                                        successorFunction, heuristicFunction);
            if (solution.length == 0) {
                let rc = lastSolveState.removedCount();
                console.log('Failed to find solution on step ' + (i+1n) +'.');
                console.log('Removed ' + rc + ' pieces.');
                return;
            }
            totalSolution.pop();
            totalSolution.push(...solution.reverse());
            lastSolveState = totalSolution[totalSolution.length - 1];
        }
        return totalSolution;
        this.#printSolution(totalSolution, state);
    }
}


let solver = new AStarSolver();

let solution = solver.solve();

postMessage(solution);



