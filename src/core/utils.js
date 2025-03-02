export function cloneObject(chef) {
    let chef1 = Object.create(chef);
    for (let p in chef) {
        if (chef.hasOwnProperty(p))
            chef1[p] = chef[p];
    }
    return chef1;
}


export class MinHeap {
    constructor(k) {
        this.k = k;
        this.heap = [];
    }

    insert(val) {
        if (this.heap.length < this.k) {
            this.heap.push(val);
            this.heapifyUp(this.heap.length - 1);
        } else {
            if (val > this.heap[0]) {
                this.heap[0] = val;
                this.heapifyDown(0);
            }
        }
    }

    heapifyUp(index) {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[parentIndex] <= this.heap[index]) break;
            [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
            index = parentIndex;
        }
    }

    heapifyDown(index) {
        let smallest = index;
        const left = 2 * index + 1;
        const right = 2 * index + 2;
        const size = this.heap.length;

        if (left < size && this.heap[left] < this.heap[smallest]) smallest = left;
        if (right < size && this.heap[right] < this.heap[smallest]) smallest = right;

        if (smallest !== index) {
            [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
            this.heapifyDown(smallest);
        }
    }

    getAll() {
        return this.heap;
    }
}
