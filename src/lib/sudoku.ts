export const DIGITS = "123456789";
const ROWS = "ABCDEFGHI";
const COLS = DIGITS;

export const BLANK_CHAR = '.';
export const BLANK_BOARD = ".".repeat(81);

const MIN_GIVENS = 17;
const NR_SQUARES = 81;



export const DIFFICULTY = {
    easy: 62,
    medium: 53,
    hard: 44,
    "very-hard": 35,
    insane: 26,
    inhuman: 17,
} as const;

export type Difficulty = keyof typeof DIFFICULTY;
export type Board = string;
type Candidates = Record<string, string>;

// Pre-computed constants (initialized once at module load)
const SQUARES = cross(ROWS, COLS);
const UNITS = getAllUnits(ROWS, COLS);
const SQUARE_UNITS_MAP = getSquareUnitsMap(SQUARES, UNITS);
const SQUARE_PEERS_MAP = getSquarePeersMap(SQUARES, SQUARE_UNITS_MAP);

// ==================== Utility Functions ====================

function cross(a: string, b: string): string[] {
    const result: string[] = [];
    for (const ai of a) {
        for (const bi of b) {
            result.push(ai + bi);
        }
    }
    return result;
}

function shuffle<T>(seq: T[]): T[] {
    // Fisher-Yates shuffle - O(n) instead of O(n^2)
    const shuffled = [...seq];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function inSeq(v: string, seq: string): boolean {
    return seq.includes(v);
}

function forceRange(nr: number, max: number, min: number = 0): number {
    nr = nr || 0;
    if (nr < min) return min;
    if (nr > max) return max;
    return nr;
}

// ==================== Square Relationships ====================

function getAllUnits(rows: string, cols: string): string[][] {
    const units: string[][] = [];

    for (const row of rows) {
        units.push(cross(row, cols));
    }

    for (const col of cols) {
        units.push(cross(rows, col));
    }

    const rowSquares = ["ABC", "DEF", "GHI"];
    const colSquares = ["123", "456", "789"];
    for (const rs of rowSquares) {
        for (const cs of colSquares) {
            units.push(cross(rs, cs));
        }
    }

    return units;
}

function getSquareUnitsMap(squares: string[], units: string[][]): Record<string, string[][]> {
    const map: Record<string, string[][]> = {};
    for (const square of squares) {
        map[square] = units.filter(unit => unit.includes(square));
    }
    return map;
}

function getSquarePeersMap(squares: string[], unitsMap: Record<string, string[][]>): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    for (const square of squares) {
        const peers = new Set<string>();
        for (const unit of unitsMap[square]) {
            for (const unitSquare of unit) {
                if (unitSquare !== square) {
                    peers.add(unitSquare);
                }
            }
        }
        map[square] = Array.from(peers);
    }
    return map;
}

function getSquareValsMap(board: Board): Record<string, string> {
    if (board.length !== NR_SQUARES) {
        throw new Error("Board/squares length mismatch.");
    }
    const map: Record<string, string> = {};
    for (let i = 0; i < SQUARES.length; i++) {
        map[SQUARES[i]] = board[i];
    }
    return map;
}

// ==================== Core Constraint Propagation ====================

function eliminate(candidates: Candidates, square: string, val: string): Candidates | false {
    if (!inSeq(val, candidates[square])) {
        return candidates;
    }

    candidates[square] = candidates[square].replace(val, '');

    const nrCandidates = candidates[square].length;

    if (nrCandidates === 0) {
        return false;
    }

    if (nrCandidates === 1) {
        const targetVal = candidates[square];
        for (const peer of SQUARE_PEERS_MAP[square]) {
            const result = eliminate(candidates, peer, targetVal);
            if (!result) return false;
        }
    }

    for (const unit of SQUARE_UNITS_MAP[square]) {
        const valPlaces = unit.filter(sq => inSeq(val, candidates[sq]));

        if (valPlaces.length === 0) {
            return false;
        } else if (valPlaces.length === 1) {
            const result = assign(candidates, valPlaces[0], val);
            if (!result) return false;
        }
    }

    return candidates;
}

function assign(candidates: Candidates, square: string, val: string): Candidates | false {
    const otherVals = candidates[square].replace(val, "");

    for (const otherVal of otherVals) {
        const result = eliminate(candidates, square, otherVal);
        if (!result) return false;
    }

    return candidates;
}

function getCandidatesMap(board: Board): Candidates | false {
    const report = validateBoard(board);
    if (report !== true) {
        throw new Error(report);
    }

    const candidateMap: Candidates = {};
    const squaresValsMap = getSquareValsMap(board);

    for (const square of SQUARES) {
        candidateMap[square] = DIGITS;
    }

    for (const [square, val] of Object.entries(squaresValsMap)) {
        if (inSeq(val, DIGITS)) {
            const newCandidates = assign(candidateMap, square, val);
            if (!newCandidates) {
                return false;
            }
        }
    }

    return candidateMap;
}

// ==================== Solver (DFS with constraint propagation) ====================

/**
 * Finds the unsolved square with the fewest remaining candidates (MRV heuristic),
 * and reports whether the board is already fully solved.
 * Single pass instead of two separate 81-square scans.
 */
function findMrvSquare(candidates: Candidates): { solved: boolean; square: string | null } {
    let minNrCandidates = 10;
    let minCandidatesSquare: string | null = null;
    let solved = true;

    for (const square of SQUARES) {
        const nrCandidates = candidates[square].length;
        if (nrCandidates > 1) {
            solved = false;
            if (nrCandidates < minNrCandidates) {
                minNrCandidates = nrCandidates;
                minCandidatesSquare = square;
            }
        }
    }

    return { solved, square: minCandidatesSquare };
}

function search(candidates: Candidates | false, reverse: boolean = false): Candidates | false {
    if (!candidates) return false;

    const { solved, square: minCandidatesSquare } = findMrvSquare(candidates);
    if (solved) return candidates;
    if (!minCandidatesSquare) return false;

    const minCandidates = candidates[minCandidatesSquare];
    const candidatesList = reverse
        ? [...minCandidates].reverse()
        : [...minCandidates];

    for (const val of candidatesList) {
        // Shallow copy is sufficient: candidate values are immutable strings.
        const candidatesCopy = { ...candidates };

        const assigned = assign(candidatesCopy, minCandidatesSquare, val);
        if (!assigned) continue;

        const candidatesNext = search(assigned, reverse);
        if (candidatesNext) {
            return candidatesNext;
        }
    }

    return false;
}

/**
 * Counts solutions up to `limit`, stopping as soon as `limit` is reached.
 * Used to check uniqueness (limit=2) far more cheaply than computing full
 * solutions with search() twice.
 */
function countSolutions(candidates: Candidates | false, limit: number): number {
    if (!candidates) return 0;

    const { solved, square: minCandidatesSquare } = findMrvSquare(candidates);
    if (solved) return 1;
    if (!minCandidatesSquare) return 0;

    let count = 0;
    for (const val of candidates[minCandidatesSquare]) {
        const candidatesCopy = { ...candidates };
        const assigned = assign(candidatesCopy, minCandidatesSquare, val);
        if (!assigned) continue;

        count += countSolutions(assigned, limit - count);
        if (count >= limit) break;
    }
    return count;
}

function hasUniqueSolution(board: Board): boolean {
    const candidates = getCandidatesMap(board);
    if (!candidates) return false;
    return countSolutions(candidates, 2) === 1;
}

// ==================== Generation ====================

/**
 * Builds one random, fully solved, valid grid via constraint propagation.
 * This almost always succeeds without backtracking; on the rare contradiction
 * it just restarts, which is cheap since no search/uniqueness-checking happens here.
 */
function generateSolvedBoard(): Board {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const candidates = getCandidatesMap(BLANK_BOARD);
        if (!candidates) continue;

        let failed = false;
        for (const square of shuffle(SQUARES)) {
            if (candidates[square].length === 1) continue;

            const opts = candidates[square];
            const val = opts[Math.floor(Math.random() * opts.length)];

            const assigned = assign(candidates, square, val);
            if (!assigned) {
                failed = true;
                break;
            }
        }
        if (failed) continue;

        let board = "";
        for (const square of SQUARES) board += candidates[square];
        return board;
    }
}

function countGivens(board: Board): number {
    let count = 0;
    for (const ch of board) {
        if (ch !== BLANK_CHAR) count++;
    }
    return count;
}

/**
 * Standard "dig holes" puzzle generation: starting from a complete solved
 * grid, try removing cells one at a time (in random order), keeping the
 * removal only if the board still has a unique solution. Each check is a
 * cheap incremental uniqueness test (early-exit at 2 solutions) rather than
 * two full solves on a from-scratch random board.
 */
function digHoles(solvedBoard: Board, targetGivens: number): Board {
    const indices = shuffle(Array.from({ length: NR_SQUARES }, (_, i) => i));
    let board = solvedBoard;
    let givens = NR_SQUARES;

    for (const idx of indices) {
        if (givens <= targetGivens) break;
        if (board[idx] === BLANK_CHAR) continue;

        const candidateBoard = board.slice(0, idx) + BLANK_CHAR + board.slice(idx + 1);

        if (hasUniqueSolution(candidateBoard)) {
            board = candidateBoard;
            givens--;
        }
    }

    return board;
}

export function generate(difficulty: Difficulty | number = "easy", unique: boolean = true): Board {
    let diff: number;
    if (typeof difficulty === "string") {
        diff = DIFFICULTY[difficulty as Difficulty] ?? DIFFICULTY.easy;
    } else {
        diff = difficulty;
    }

    diff = forceRange(diff, NR_SQUARES, MIN_GIVENS);

    if (!unique) {
        // No uniqueness requirement: a single random removal pass is enough,
        // no solving required at all.
        const solvedBoard = generateSolvedBoard();
        const toBlank = shuffle(Array.from({ length: NR_SQUARES }, (_, i) => i))
            .slice(0, NR_SQUARES - diff);
        const chars = solvedBoard.split("");
        for (const idx of toBlank) chars[idx] = BLANK_CHAR;
        return chars.join("");
    }

    // Digging to very low clue counts (insane/inhuman) doesn't always reach
    // the exact target from an arbitrary starting grid - true minimal unique
    // puzzles at 17-26 clues are rare. Bound the attempts and keep the best
    // (fewest-givens) result found, instead of retrying forever.
    const MAX_ATTEMPTS = 20;
    let best: Board | null = null;
    let bestGivens = NR_SQUARES + 1;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const solvedBoard = generateSolvedBoard();
        const dug = digHoles(solvedBoard, diff);
        const givens = countGivens(dug);

        if (givens <= diff) {
            return dug;
        }
        if (givens < bestGivens) {
            best = dug;
            bestGivens = givens;
        }
    }

    return best as Board;
}

export function solve(board: Board, reverse: boolean = false): Board | false {
    const report = validateBoard(board);
    if (report !== true) {
        throw new Error(report);
    }

    let nrGivens = 0;
    for (const char of board) {
        if (char !== BLANK_CHAR && inSeq(char, DIGITS)) {
            ++nrGivens;
        }
    }

    if (nrGivens < MIN_GIVENS) {
        throw new Error(`Too few givens. Minimum givens is ${MIN_GIVENS}`);
    }

    const candidates = getCandidatesMap(board);
    if (!candidates) return false;

    const result = search(candidates, reverse);

    if (result) {
        let solution = "";
        for (const square of SQUARES) {
            solution += result[square];
        }
        return solution;
    }

    return false;
}

export function getCandidates(board: Board): string[][] | false {
    const report = validateBoard(board);
    if (report !== true) {
        throw new Error(report);
    }

    const candidatesMap = getCandidatesMap(board);
    if (!candidatesMap) {
        return false;
    }

    const rows: string[][] = [];
    let curRow: string[] = [];
    let i = 0;

    for (const square of SQUARES) {
        curRow.push(candidatesMap[square]);
        if (i % 9 === 8) {
            rows.push(curRow);
            curRow = [];
        }
        ++i;
    }

    return rows;
}

export function validateBoard(board: Board): true | string {
    if (!board) {
        return "Empty board";
    }

    if (board.length !== NR_SQUARES) {
        return `Invalid board size. Board must be exactly ${NR_SQUARES} squares.`;
    }

    for (let i = 0; i < board.length; i++) {
        if (!inSeq(board[i], DIGITS) && board[i] !== BLANK_CHAR) {
            return `Invalid board character encountered at index ${i}: ${board[i]}`;
        }
    }

    return true;
}

export function boardStringToGrid(boardString: Board): string[][] {
    const rows: string[][] = [];
    let curRow: string[] = [];

    for (let i = 0; i < boardString.length; i++) {
        curRow.push(boardString[i]);
        if (i % 9 === 8) {
            rows.push(curRow);
            curRow = [];
        }
    }

    return rows;
}

export function boardGridToString(boardGrid: string[][]): Board {
    return boardGrid.flat().join('');
}

export function printBoard(board: Board): void {
    const report = validateBoard(board);
    if (report !== true) {
        throw new Error(report);
    }

    const V_PADDING = " ";
    const H_PADDING = '\n';
    const V_BOX_PADDING = "  ";
    const H_BOX_PADDING = '\n';

    let displayString = "";

    for (let i = 0; i < board.length; i++) {
        const square = board[i];
        displayString += square + V_PADDING;

        if (i % 3 === 2) {
            displayString += V_BOX_PADDING;
        }

        if (i % 9 === 8) {
            displayString += H_PADDING;
        }

        if (i % 27 === 26) {
            displayString += H_BOX_PADDING;
        }
    }

    console.log(displayString);
}