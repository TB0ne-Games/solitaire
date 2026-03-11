/**
 * Klondike Solitaire Core Logic
 */

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_SYMBOLS = { 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣', 'spades': '♠' };

let deck = [];
let stock = [];
let waste = [];
let foundations = [[], [], [], []]; // 0=hearts, 1=diamonds, 2=clubs, 3=spades
let tableau = [[], [], [], [], [], [], []]; // 7 columns

let moves = 0;
// Drag state (we drag an object containing the source info and the group of cards being dragged)
let dragState = null; 

const moveCountEl = document.getElementById('move-count');
const stockEl = document.getElementById('stock');
const wasteEl = document.getElementById('waste');

function initGame() {
    moves = 0;
    updateMoveCount();
    deck = generateDeck();
    shuffle(deck);
    
    // reset state
    stock = [];
    waste = [];
    foundations = [[], [], [], []];
    tableau = [[], [], [], [], [], [], []];

    dealTableau();
    stock = deck; // remaining cards to stock
    deck = [];

    renderBoard();
    setupEventListeners();
}

function generateDeck() {
    let newDeck = [];
    for (let suit of SUITS) {
        for (let i = 0; i < RANKS.length; i++) {
            newDeck.push({
                suit: suit,
                rank: RANKS[i],
                value: i + 1, // A=1, K=13
                color: (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black',
                faceUp: false,
                id: `${suit}-${RANKS[i]}`
            });
        }
    }
    return newDeck;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function dealTableau() {
    for (let i = 0; i < 7; i++) {
        for (let j = i; j < 7; j++) {
            let card = deck.pop();
            // Optional: for actual cascade dealing animation we'd use delays, but we deal instantaneously here
            tableau[j].push(card);
        }
    }
    // Flip top cards
    for (let i = 0; i < 7; i++) {
        if(tableau[i].length > 0) tableau[i][tableau[i].length - 1].faceUp = true;
    }
}

// ------ RENDERING ------

function renderBoard() {
    renderStock();
    renderWaste();
    renderFoundations();
    renderTableau();
}

function createCardElement(card, sourceInfo, cardIndex) {
    const el = document.createElement('div');
    el.classList.add('card', card.color);
    el.dataset.id = card.id;
    el.dataset.source = JSON.stringify(sourceInfo);
    el.dataset.index = cardIndex;

    if (card.faceUp) {
        el.innerHTML = `
            <div class="top-left">
                <span class="rank">${card.rank}</span>
                <span class="suit-small">${SUIT_SYMBOLS[card.suit]}</span>
            </div>
            <div class="center-suit">${SUIT_SYMBOLS[card.suit]}</div>
            <div class="bottom-right">
                <span class="rank">${card.rank}</span>
                <span class="suit-small">${SUIT_SYMBOLS[card.suit]}</span>
            </div>
        `;
        
        // Only face up cards are draggable
        el.draggable = true;
        el.addEventListener('dragstart', handleDragStart);
        el.addEventListener('dragend', handleDragEnd);
        
        // Double click to auto-move to foundation
        el.addEventListener('dblclick', () => handleDoubleClick(card, sourceInfo));
    } else {
        el.classList.add('face-down');
        el.draggable = false;
    }

    return el;
}

function renderStock() {
    stockEl.innerHTML = '';
    if (stock.length > 0) {
        // Draw a simulated card back
        const el = document.createElement('div');
        el.classList.add('card', 'face-down');
        stockEl.appendChild(el);
    } else {
        // Empty stock - click to recycle waste
        stockEl.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:rgba(255,255,255,0.4); font-size: 2rem;">↻</div>';
    }
}

function renderWaste() {
    wasteEl.innerHTML = '';
    // Show only the top card or a slight stack effect. For simplicity, we just show the top 3 slightly offset, or just the top 1. Let's do top 1.
    if (waste.length > 0) {
        // Only show top 3 maximum, staggered. Stagger logic can be added, but let's just show top 1 for now for simplicity in HTML structure.
        const topCard = waste[waste.length - 1];
        const el = createCardElement(topCard, { type: 'waste' }, waste.length - 1);
        el.style.zIndex = waste.length;
        wasteEl.appendChild(el);
    }
}

function renderFoundations() {
    for (let i = 0; i < 4; i++) {
        const fEl = document.getElementById(`foundation-${i}`);
        fEl.innerHTML = '';
        if (foundations[i].length > 0) {
            const topCard = foundations[i][foundations[i].length - 1];
            const el = createCardElement(topCard, { type: 'foundation', col: i }, foundations[i].length - 1);
            fEl.appendChild(el);
        }
    }
}

function renderTableau() {
    for (let i = 0; i < 7; i++) {
        const colEl = document.getElementById(`tableau-${i}`);
        colEl.innerHTML = '';
        
        let offsetY = 0;
        for (let j = 0; j < tableau[i].length; j++) {
            const card = tableau[i][j];
            const el = createCardElement(card, { type: 'tableau', col: i }, j);
            el.style.top = `${offsetY}px`;
            el.style.zIndex = j;
            colEl.appendChild(el);
            
            // Adjust cascading spacing. Face down closer together than face up
            offsetY += card.faceUp ? 25 : 10;
        }
        
        // Apply minimum height to container so it can be target for empty drop
        colEl.style.minHeight = `calc(var(--card-height) + ${offsetY}px)`;
    }
}

// ------ INTERACTION LOGIC ------

function setupEventListeners() {
    document.getElementById('new-game-btn').addEventListener('click', initGame);
    
    // Stock click handler
    stockEl.addEventListener('click', handleStockClick);

    // Setup drop zones
    setupDropZone(wasteEl, 'waste');
    for (let i = 0; i < 4; i++) {
        setupDropZone(document.getElementById(`foundation-${i}`), 'foundation', i);
    }
    for (let i = 0; i < 7; i++) {
        setupDropZone(document.getElementById(`tableau-${i}`), 'tableau', i);
    }
}

function handleStockClick() {
    if (stock.length === 0) {
        if (waste.length === 0) return; // both empty
        // Recycle waste to stock
        stock = waste.reverse();
        stock.forEach(c => c.faceUp = false);
        waste = [];
    } else {
        // Draw up to 3 cards
        for (let i = 0; i < 3 && stock.length > 0; i++) {
            const card = stock.pop();
            card.faceUp = true;
            waste.push(card);
        }
    }
    incrementMoves();
    renderStock();
    renderWaste();
}

function handleDoubleClick(card, sourceInfo) {
    if (!card.faceUp) return;
    
    // Only moving single cards to foundation this way
    let sourceArray = getSourceArray(sourceInfo);
    if (!sourceArray || sourceArray[sourceArray.length-1].id !== card.id) return; // Must be top card

    // Try finding valid foundation
    let targetFIndex = getValidFoundationIndex(card);
    if (targetFIndex !== -1) {
        moveCards(sourceInfo, { type: 'foundation', col: targetFIndex }, sourceArray.length - 1);
        incrementMoves();
        flipTopTableauCard(sourceInfo);
        renderBoard();
        checkWin();
    }
}

// ------ DRAG AND DROP ------

function handleDragStart(e) {
    const el = e.currentTarget;
    const sourceInfo = JSON.parse(el.dataset.source);
    const index = parseInt(el.dataset.index);
    
    // Determine the cards being dragged
    let draggedCards = [];
    let sourceArray = getSourceArray(sourceInfo);
    
    if (sourceArray) {
        draggedCards = sourceArray.slice(index);
    }

    if (draggedCards.length === 0) {
        e.preventDefault();
        return;
    }

    dragState = {
        sourceInfo: sourceInfo,
        index: index,
        cards: draggedCards,
        elements: []
    };

    // Need a tiny timeout to add dragging class so it doesn't break drag image
    setTimeout(() => {
        // In a real cascading drag, we'd want to drag the whole stack visually.
        // The browser preview usually just grabs the clicked element.
        // We'll add standard dragging class.
        el.classList.add('dragging');
        // If it's a stack (tableau), add visual feedback
        if (sourceInfo.type === 'tableau') {
            const colEl = document.getElementById(`tableau-${sourceInfo.col}`);
            const children = Array.from(colEl.children);
            for (let i = index; i < children.length; i++) {
                children[i].classList.add('dragging');
                dragState.elements.push(children[i]);
            }
        } else {
            dragState.elements.push(el);
        }
    }, 0);
}

function handleDragEnd(e) {
    if (dragState && dragState.elements) {
        dragState.elements.forEach(el => el.classList.remove('dragging'));
    }
    dragState = null;
    
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function setupDropZone(element, type, col) {
    element.addEventListener('dragover', e => {
        e.preventDefault(); // allow drop
        if (!dragState) return;
        
        let valid = false;
        if (type === 'tableau') {
            valid = isValidTableauMove(dragState.cards, col);
        } else if (type === 'foundation') {
            valid = isValidFoundationMove(dragState.cards, col);
        }

        if (valid) {
            e.currentTarget.classList.add('drag-over');
            e.dataTransfer.dropEffect = 'move';
        } else {
            e.currentTarget.classList.remove('drag-over');
            e.dataTransfer.dropEffect = 'none';
        }
    });

    element.addEventListener('dragleave', e => {
        e.currentTarget.classList.remove('drag-over');
    });

    element.addEventListener('drop', e => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        if (!dragState) return;

        let valid = false;
        if (type === 'tableau') {
            valid = isValidTableauMove(dragState.cards, col);
        } else if (type === 'foundation') {
            valid = isValidFoundationMove(dragState.cards, col);
        }

        if (valid) {
            moveCards(dragState.sourceInfo, { type: type, col: col }, dragState.index);
            incrementMoves();
            flipTopTableauCard(dragState.sourceInfo);
            renderBoard();
            checkWin();
        }
        
        dragState = null;
    });
}

// ------ VALIDATION & MECHANICS ------

function getSourceArray(sourceInfo) {
    if (sourceInfo.type === 'tableau') return tableau[sourceInfo.col];
    if (sourceInfo.type === 'waste') return waste;
    if (sourceInfo.type === 'foundation') return foundations[sourceInfo.col];
    return null;
}

function isValidTableauMove(cardsMoved, targetCol) {
    const targetPile = tableau[targetCol];
    const card = cardsMoved[0]; // The top card of the stack being moved

    if (targetPile.length === 0) {
        // Only Kings on empty spots
        return card.rank === 'K';
    } else {
        const topCardVal = targetPile[targetPile.length - 1];
        if (!topCardVal.faceUp) return false;
        
        // Alternating color, descending rank
        return (topCardVal.color !== card.color) && (topCardVal.value - 1 === card.value);
    }
}

function isValidFoundationMove(cardsMoved, targetCol) {
    // Can only move single cards to foundation
    if (cardsMoved.length !== 1) return false;
    
    const targetPile = foundations[targetCol];
    const card = cardsMoved[0];

    // Foundation suit must match the pile's intended suit once we determine it loosely,
    // or we strictly assign piles via HTML attribute? We assigned data-suit in HTML.
    const fEl = document.getElementById(`foundation-${targetCol}`);
    const reqSuit = fEl.dataset.suit;
    
    if (card.suit !== reqSuit) return false;

    if (targetPile.length === 0) {
        return card.rank === 'A';
    } else {
        const topCardVal = targetPile[targetPile.length - 1];
        return (topCardVal.value + 1 === card.value);
    }
}

function moveCards(sourceInfo, targetInfo, startIndex) {
    const sourceArray = getSourceArray(sourceInfo);
    let targetArray;
    if (targetInfo.type === 'tableau') targetArray = tableau[targetInfo.col];
    else if (targetInfo.type === 'foundation') targetArray = foundations[targetInfo.col];
    
    const cardsToMove = sourceArray.splice(startIndex);
    targetArray.push(...cardsToMove);
}

function flipTopTableauCard(sourceInfo) {
    if (sourceInfo.type === 'tableau') {
        const sourceArray = tableau[sourceInfo.col];
        if (sourceArray.length > 0) {
            const topCard = sourceArray[sourceArray.length - 1];
            if (!topCard.faceUp) {
                topCard.faceUp = true;
            }
        }
    }
}

function getValidFoundationIndex(card) {
    for (let i = 0; i < 4; i++) {
        if (isValidFoundationMove([card], i)) {
            return i;
        }
    }
    return -1;
}

function incrementMoves() {
    moves++;
    updateMoveCount();
}

function updateMoveCount() {
    moveCountEl.innerText = moves;
}

function checkWin() {
    let win = true;
    for (let i = 0; i < 4; i++) {
        if (foundations[i].length !== 13) {
            win = false;
            break;
        }
    }
    if (win) {
        setTimeout(() => {
            alert(`You won in ${moves} moves!`);
        }, 500);
    }
}

// Start immediately on load
initGame();
