// 'use client';

// import { Chessboard } from 'react-chessboard';
// import { Chess, Square } from 'chess.js';
// import { TouchBackend } from 'react-dnd-touch-backend';
// import { useState, useEffect, useMemo, useCallback } from 'react';
// import { io, Socket } from 'socket.io-client';
// import { useSearchParams } from 'next/navigation';
// import Link from 'next/link';
// import { Home } from 'lucide-react';
// import { CopyToClipboard } from '@/components/ui/copy-to-clipboard';

// interface GameProps {
//     initialColor?: 'white' | 'black';
// }

// interface ChessMove {
//     from: string;
//     to: string;
//     promotion?: 'q' | 'r' | 'b' | 'n';
// }

// interface Alert {
//     title: string;
//     message: string;
//     type: 'success' | 'warning' | 'error' | 'info';
// }

// export default function Game({ initialColor = 'white' }: GameProps) {
//     const [game, setGame] = useState<Chess>(new Chess());
//     const [socket, setSocket] = useState<Socket | null>(null);
//     const playerColor: 'white' | 'black' = initialColor;
//     const [gameHasStarted, setGameHasStarted] = useState(false);
//     const [gameOver, setGameOver] = useState(false);
//     const [status, setStatus] = useState('Waiting for opponent to join');
//     const [alerts, setAlerts] = useState<Alert[]>([]);
//     const [pgn, setPgn] = useState('');
//     const [fen, setFen] = useState(game.fen());
//     const [connectionStatus, setConnectionStatus] = useState('Connecting...');
//     const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
//     const searchParams = useSearchParams();
//     const gameCode = searchParams.get('code');

//     const appendAlert = useCallback(
//         (title: string, message: string, type: Alert['type']): void => {
//             setAlerts((prev) => [...prev, { title, message, type }]);
//             setTimeout(() => {
//                 setAlerts((prev) =>
//                     prev.filter(
//                         (a) => a.title !== title || a.message !== message
//                     )
//                 );
//             }, 5000);
//         },
//         []
//     );

//     const updateStatus = useCallback((): void => {
//         let statusText = '';
//         const turn = game.turn();
//         const moveColorString = turn === 'w' ? 'White' : 'Black';

//         if (game.isCheckmate()) {
//             statusText = `Game over, ${moveColorString} is in checkmate.`;
//             appendAlert('Game Over', statusText, 'success');
//             setGameOver(true);
//         } else if (game.isDraw()) {
//             statusText = 'Game over, drawn position';
//             appendAlert('Draw', statusText, 'success');
//             setGameOver(true);
//         } else if (gameOver) {
//             statusText = 'Opponent disconnected, you win!';
//         } else if (!gameHasStarted) {
//             statusText = 'Waiting for opponent to join';
//         } else {
//             statusText = `${moveColorString} to move`;
//             if (game.isCheck()) {
//                 statusText += `, ${moveColorString} is in check`;
//             }
//         }

//         setStatus(statusText);
//         setPgn(game.pgn());
//     }, [game, gameHasStarted, gameOver, appendAlert]);

//     const makeAMove = useCallback(
//         (move: ChessMove): ReturnType<Chess['move']> => {
//             const gameCopy = new Chess(game.fen());
//             const result = gameCopy.move(move);
//             if (result) {
//                 setGame(gameCopy);
//                 setFen(gameCopy.fen());
//             }
//             return result;
//         },
//         [game]
//     );

//     // Add this useEffect to unselect the piece when it's not the player's turn
//     useEffect(() => {
//         if (
//             (playerColor === 'white' && game.turn() === 'b') ||
//             (playerColor === 'black' && game.turn() === 'w')
//         ) {
//             setSelectedSquare(null);
//         }
//     }, [game, playerColor]);

//     // Updated onDrop function
//     const onDrop = useCallback(
//         (source: string, target: string): boolean => {
//             if (
//                 !gameHasStarted ||
//                 (playerColor === 'white' && game.turn() === 'b') ||
//                 (playerColor === 'black' && game.turn() === 'w')
//             ) {
//                 return false;
//             }

//             const move = makeAMove({
//                 from: source,
//                 to: target,
//                 promotion: 'q',
//             });

//             if (move === null) return false;

//             setSelectedSquare(null); // Unselect the piece after move
//             socket?.emit('move', {
//                 from: source,
//                 to: target,
//                 promotion: 'q',
//             });
//             updateStatus();
//             return true;
//         },
//         [
//             game,
//             gameHasStarted,
//             playerColor,
//             makeAMove,
//             socket,
//             updateStatus,
//             setSelectedSquare,
//         ]
//     );

//     const onSquareClick = useCallback(
//         (square: string) => {
//             if (!gameHasStarted || gameOver) return;
//             const piece = game.get(square as Square);

//             if (selectedSquare === square) {
//                 setSelectedSquare(null);
//             } else if (selectedSquare === null) {
//                 if (
//                     piece &&
//                     ((playerColor === 'white' && piece.color === 'w') ||
//                         (playerColor === 'black' && piece.color === 'b')) &&
//                     ((playerColor === 'white' && game.turn() === 'w') ||
//                         (playerColor === 'black' && game.turn() === 'b'))
//                 ) {
//                     setSelectedSquare(square);
//                 }
//             } else {
//                 const move = makeAMove({
//                     from: selectedSquare,
//                     to: square,
//                     promotion: 'q',
//                 });

//                 if (move) {
//                     socket?.emit('move', {
//                         from: selectedSquare,
//                         to: square,
//                         promotion: 'q',
//                     });
//                     setSelectedSquare(null);
//                     updateStatus();
//                 } else {
//                     if (
//                         piece &&
//                         ((playerColor === 'white' && piece.color === 'w') ||
//                             (playerColor === 'black' && piece.color === 'b')) &&
//                         ((playerColor === 'white' && game.turn() === 'w') ||
//                             (playerColor === 'black' && game.turn() === 'b'))
//                     ) {
//                         setSelectedSquare(square);
//                     } else {
//                         setSelectedSquare(null);
//                     }
//                 }
//             }
//         },
//         [
//             selectedSquare,
//             game,
//             playerColor,
//             makeAMove,
//             socket,
//             updateStatus,
//             gameHasStarted,
//             gameOver,
//         ]
//     );

//     const legalMoves = useMemo(() => {
//         if (selectedSquare) {
//             return game
//                 .moves({ square: selectedSquare as Square, verbose: true })
//                 .map((move) => move.to);
//         }
//         return [];
//     }, [selectedSquare, game]);

//     const squareStyles = useMemo(() => {
//         const styles: { [key: string]: React.CSSProperties } = {};
//         if (selectedSquare) {
//             styles[selectedSquare] = {
//                 backgroundColor: 'rgba(255, 255, 0, 0.4)',
//             };
//             legalMoves.forEach((square) => {
//                 styles[square] = {
//                     backgroundImage:
//                         'radial-gradient(circle, rgba(184, 1844, 18, 0.8) 0%, rgba(184, 184, 184, 0.8) 20%, transparent 20%)',
//                     backgroundPosition: 'center',
//                     backgroundRepeat: 'no-repeat',
//                 };
//             });
//         }
//         return styles;
//     }, [selectedSquare, legalMoves]);

//     const isDraggablePiece = useCallback(
//         ({ piece }: { piece: string; sourceSquare: string }): boolean => {
//             if (
//                 !gameHasStarted ||
//                 gameOver ||
//                 (playerColor === 'white' && game.turn() === 'b') ||
//                 (playerColor === 'black' && game.turn() === 'w')
//             ) {
//                 return false;
//             }
//             return piece.startsWith(playerColor[0]);
//         },
//         [game, gameHasStarted, gameOver, playerColor]
//     );

//     const pieces = [
//         'wP',
//         'wN',
//         'wB',
//         'wR',
//         'wQ',
//         'wK',
//         'bP',
//         'bN',
//         'bB',
//         'bR',
//         'bQ',
//         'bK',
//     ];

//     const customPieces = useMemo(() => {
//         const pieceComponents: {
//             [key: string]: React.FC<{ squareWidth: number }>;
//         } = {};
//         pieces.forEach((piece) => {
//             pieceComponents[piece] = ({ squareWidth }) => (
//                 <div
//                     style={{
//                         width: squareWidth,
//                         height: squareWidth,
//                         backgroundImage: `url(/${piece}.png)`,
//                         backgroundSize: '100%',
//                     }}
//                 />
//             );
//         });
//         return pieceComponents;
//     }, [pieces]);

//     useEffect(() => {
//         const newSocket = io('https://chess-backend-lv8y.onrender.com', {
//             reconnectionAttempts: 5,
//             reconnectionDelay: 2000,
//             reconnectionDelayMax: 5000,
//             timeout: 10000,
//         });

//         newSocket.on('connect', () => {
//             console.log('Connected to server, socket ID:', newSocket.id);
//             setConnectionStatus('Connected');
//             if (gameCode) {
//                 console.log('Joining game with code:', gameCode);
//                 newSocket.emit('join-game', { code: gameCode });
//             } else {
//                 console.warn('No gameCode provided');
//             }
//         });

//         newSocket.on('start-game', () => {
//             console.log('Game started!');
//             setGameHasStarted(true);
//             updateStatus?.(); // optional chaining in case it's undefined
//             appendAlert?.(
//                 'Game Started',
//                 'Your opponent has joined!',
//                 'success'
//             );
//         });

//         newSocket.on('new-move', (move) => {
//             console.log('Received move:', move);
//             const result = makeAMove?.(move);
//             if (result) {
//                 updateStatus?.();
//             } else {
//                 console.warn('Invalid move received:', move);
//             }
//         });

//         newSocket.on('game-over-disconnect', () => {
//             console.log('Game over: opponent disconnected');
//             setGameOver(true);
//             appendAlert?.(
//                 'Opponent Left',
//                 'Your opponent has disconnected',
//                 'warning'
//             );
//             updateStatus?.();
//         });

//         newSocket.on('connect_error', (err) => {
//             console.error('Connection error:', err.message, err);
//             setConnectionStatus(`Connection error: ${err.message}`);
//         });

//         newSocket.on('reconnect_attempt', (attempt) => {
//             console.log(`Reconnection attempt ${attempt}`);
//         });

//         newSocket.on('reconnect_failed', () => {
//             console.error('Reconnection failed after 5 attempts');
//             setConnectionStatus('Failed to reconnect - check server');
//         });

//         setSocket(newSocket);

//         return () => {
//             console.log('Disconnecting socket');
//             newSocket.disconnect();
//         };
//     }, [gameCode]); 


//     useEffect(() => {
//         updateStatus();
//     }, [game, gameHasStarted, gameOver, updateStatus]);

//     useEffect(() => {
//         setGame(new Chess());
//         setSelectedSquare(null);
//         setGameOver(false);
//         setGameHasStarted(false);
//         setPgn('');
//         setFen(game.fen());
//         setStatus('Waiting for opponent to join');
//     }, [game, playerColor]);

//     return (
//         <div className="flex flex-col items-center justify-center min-h-screen p-4">
//             <div className="w-full max-w-2xl">
//                 <div className="mb-4">
//                     <div className="mb-2 p-2 border-2 border-zinc-100 rounded-xl flex items-center justify-center">
//                         <Link
//                             href={'https://chessgame-85747.vercel.app/'}
//                             className="flex items-center gap-2 hover:text-blue-500 transition-colors duration-200"
//                         >
//                             <Home className="h-5 w-5" />
//                             Return to home.
//                         </Link>
//                     </div>

//                     {connectionStatus !== 'Connected' && (
//                         <div className="mb-2 p-2 bg-yellow-100 rounded-xl">
//                             <strong>Status:</strong> {connectionStatus}
//                         </div>
//                     )}

//                     {gameCode && (
//                         <div className="mb-2 p-2 border-2 border-zinc-100 rounded-xl text-center">
//                             Game Code: <CopyToClipboard text={`${gameCode}`} />
//                             Game Link:{' '}
//                             <CopyToClipboard
//                                 text={`${
//                                     playerColor === 'white'
//                                         ? 'https://chessgame-85747.vercel.app/black?code='
//                                         : 'https://chessgame-85747.vercel.app/white?code='
//                                 }${gameCode}`}
//                             />
//                         </div>
//                     )}

//                     <div className="p-2 border-2 border-zinc-100 rounded-xl">
//                         <p>
//                             <strong>Status:</strong> {status}
//                         </p>
//                         <p>
//                             <strong>Playing as:</strong> {playerColor}
//                         </p>
//                     </div>
//                 </div>

//                 <div className="mb-4">
//                     <Chessboard
//                         id="myBoard"
//                         position={fen}
//                         onPieceDrop={onDrop}
//                         onSquareClick={onSquareClick}
//                         isDraggablePiece={isDraggablePiece}
//                         boardOrientation={playerColor}
//                         customBoardStyle={{
//                             borderRadius: '15px',
//                         }}
//                         customDarkSquareStyle={{
//                             backgroundColor: '#6D98BA',
//                         }}
//                         customLightSquareStyle={{
//                             backgroundColor: '#F5F1ED',
//                         }}
//                         customPieces={customPieces}
//                         customSquareStyles={squareStyles}
//                         customDndBackend={TouchBackend}
//                         customDndBackendOptions={{ enableMouseEvents: true }}
//                     />
//                 </div>

//                 <div className="mb-4 p-2 bg-gray-100 rounded-2xl overflow-auto max-h-40">
//                     <p>
//                         <strong>PGN:</strong>
//                     </p>
//                     <pre>{pgn || 'No moves yet'}</pre>
//                 </div>
//             </div>
//             {alerts.length > 0 && <p></p>}
//         </div>
//     );
// }
'use client';

import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react';
import { CopyToClipboard } from '@/components/ui/copy-to-clipboard';

interface GameProps {
    initialColor?: 'white' | 'black';
}

interface ChessMove {
    from: string;
    to: string;
    promotion?: 'q' | 'r' | 'b' | 'n';
}

interface Alert {
    title: string;
    message: string;
    type: 'success' | 'warning' | 'error' | 'info';
}

export default function Game({ initialColor = 'white' }: GameProps) {
    const [game, setGame] = useState<Chess>(new Chess());
    const [socket, setSocket] = useState<Socket | null>(null);
    const playerColor: 'white' | 'black' = initialColor;
    const [gameHasStarted, setGameHasStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [status, setStatus] = useState('Waiting for opponent to join');
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [pgn, setPgn] = useState('');
    const [fen, setFen] = useState(game.fen());
    const [connectionStatus, setConnectionStatus] = useState('Connecting...');
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const gameCode = searchParams.get('code');

    const appendAlert = useCallback(
        (title: string, message: string, type: Alert['type']): void => {
            console.log(`Alert: ${title} - ${message} (${type})`);
            setAlerts((prev) => [...prev, { title, message, type }]);
            setTimeout(() => {
                setAlerts((prev) =>
                    prev.filter(
                        (a) => a.title !== title || a.message !== message
                    )
                );
            }, 5000);
        },
        []
    );

    const updateStatus = useCallback((): void => {
        let statusText = '';
        const turn = game.turn();
        const moveColorString = turn === 'w' ? 'White' : 'Black';

        if (game.isCheckmate()) {
            statusText = `Game over, ${moveColorString} is in checkmate.`;
            appendAlert('Game Over', statusText, 'success');
            setGameOver(true);
        } else if (game.isDraw()) {
            statusText = 'Game over, drawn position';
            appendAlert('Draw', statusText, 'success');
            setGameOver(true);
        } else if (gameOver) {
            statusText = 'Opponent disconnected, you win!';
        } else if (!gameHasStarted) {
            statusText = 'Waiting for opponent to join';
        } else {
            statusText = `${moveColorString} to move`;
            if (game.isCheck()) {
                statusText += `, ${moveColorString} is in check`;
            }
        }

        console.log(`Status updated: ${statusText}`);
        setStatus(statusText);
        setPgn(game.pgn());
        setFen(game.fen());
    }, [game, gameHasStarted, gameOver, appendAlert]);

    const makeAMove = useCallback(
        (move: ChessMove): ReturnType<Chess['move']> | null => {
            console.log(`Attempting move:`, move);
            const gameCopy = new Chess(game.fen());
            try {
                const result = gameCopy.move(move);
                if (result) {
                    console.log(`Move successful:`, result);
                    setGame(gameCopy);
                    setFen(gameCopy.fen());
                    return result;
                } else {
                    console.warn(`Invalid move:`, move);
                    return null;
                }
            } catch (error) {
                console.error(`Move error:`, error);
                return null;
            }
        },
        [game]
    );

    useEffect(() => {
        if (
            (playerColor === 'white' && game.turn() === 'b') ||
            (playerColor === 'black' && game.turn() === 'w')
        ) {
            setSelectedSquare(null);
        }
    }, [game, playerColor]);

    const onDrop = useCallback(
        (source: string, target: string): boolean => {
            console.log(`onDrop: ${source} to ${target}, gameHasStarted: ${gameHasStarted}, gameOver: ${gameOver}`);
            if (
                !gameHasStarted ||
                gameOver ||
                (playerColor === 'white' && game.turn() === 'b') ||
                (playerColor === 'black' && game.turn() === 'w')
            ) {
                console.warn('Move blocked: Not your turn or game not started/over');
                return false;
            }

            const move: ChessMove = {
                from: source,
                to: target,
                promotion: undefined,
            };

            const piece = game.get(source as Square);
            if (
                piece?.type === 'p' &&
                ((piece.color === 'w' && target[1] === '8') ||
                 (piece.color === 'b' && target[1] === '1'))
            ) {
                move.promotion = 'q';
            }

            const result = makeAMove(move);
            if (result) {
                socket?.emit('move', move);
                setSelectedSquare(null);
                updateStatus();
                console.log(`Move emitted: ${source} to ${target}`);
                return true;
            }
            console.warn(`Move failed: ${source} to ${target}`);
            return false;
        },
        [game, gameHasStarted, gameOver, playerColor, makeAMove, socket, updateStatus]
    );

    const onSquareClick = useCallback(
        (square: string) => {
            console.log(`Square clicked: ${square}, gameHasStarted: ${gameHasStarted}, gameOver: ${gameOver}`);
            if (!gameHasStarted || gameOver) {
                console.warn('Click ignored: Game not started or over');
                return;
            }

            const piece = game.get(square as Square);
            if (selectedSquare === null) {
                if (
                    piece &&
                    ((playerColor === 'white' && piece.color === 'w') ||
                     (playerColor === 'black' && piece.color === 'b')) &&
                    ((playerColor === 'white' && game.turn() === 'w') ||
                     (playerColor === 'black' && game.turn() === 'b'))
                ) {
                    console.log(`Selected piece on ${square}`);
                    setSelectedSquare(square);
                } else {
                    console.warn(`Invalid piece selection: ${square}`);
                }
            } else {
                const move: ChessMove = {
                    from: selectedSquare,
                    to: square,
                    promotion: undefined,
                };

                const piece = game.get(selectedSquare as Square);
                if (
                    piece?.type === 'p' &&
                    ((piece.color === 'w' && square[1] === '8') ||
                     (piece.color === 'b' && square[1] === '1'))
                ) {
                    move.promotion = 'q';
                }

                const result = makeAMove(move);
                if (result) {
                    socket?.emit('move', move);
                    setSelectedSquare(null);
                    updateStatus();
                    console.log(`Move executed: ${selectedSquare} to ${square}`);
                } else {
                    if (
                        piece &&
                        ((playerColor === 'white' && piece.color === 'w') ||
                         (playerColor === 'black' && piece.color === 'b')) &&
                        ((playerColor === 'white' && game.turn() === 'w') ||
                         (playerColor === 'black' && game.turn() === 'b'))
                    ) {
                        console.log(`Switching selection to ${square}`);
                        setSelectedSquare(square);
                    } else {
                        console.warn(`Deselecting: Invalid move or piece`);
                        setSelectedSquare(null);
                    }
                }
            }
        },
        [game, gameHasStarted, gameOver, playerColor, selectedSquare, makeAMove, socket, updateStatus]
    );

    const legalMoves = useMemo(() => {
        if (selectedSquare) {
            const moves = game
                .moves({ square: selectedSquare as Square, verbose: true })
                .map((move) => move.to);
            console.log(`Legal moves for ${selectedSquare}:`, moves);
            return moves;
        }
        return [];
    }, [selectedSquare, game]);

    const squareStyles = useMemo(() => {
        const styles: { [key: string]: React.CSSProperties } = {};
        if (selectedSquare) {
            styles[selectedSquare] = {
                backgroundColor: 'rgba(255, 255, 0, 0.4)',
            };
            legalMoves.forEach((square) => {
                styles[square] = {
                    backgroundImage:
                        'radial-gradient(circle, rgba(184, 184, 184, 0.8) 20%, transparent 20%)',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                };
            });
        }
        return styles;
    }, [selectedSquare, legalMoves]);

    const isDraggablePiece = useCallback(
        ({ piece, sourceSquare }: { piece: string; sourceSquare: string }): boolean => {
            const canMove =
                gameHasStarted &&
                !gameOver &&
                ((playerColor === 'white' && game.turn() === 'w' && piece.startsWith('w')) ||
                 (playerColor === 'black' && game.turn() === 'b' && piece.startsWith('b')));
            console.log(`isDraggablePiece: ${piece} from ${sourceSquare}, canMove: ${canMove}`);
            return canMove;
        },
        [game, gameHasStarted, gameOver, playerColor]
    );

    const pieces = [
        'wP', 'wN', 'wB', 'wR', 'wQ', 'wK',
        'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'
    ];

    const customPieces = useMemo(() => {
        const pieceComponents: {
            [key: string]: React.FC<{ squareWidth: number }>;
        } = {};
        pieces.forEach((piece) => {
            pieceComponents[piece] = ({ squareWidth }) => (
                <div
                    style={{
                        width: squareWidth,
                        height: squareWidth,
                        backgroundImage: `url(/${piece}.png)`,
                        backgroundSize: '100%',
                    }}
                />
            );
        });
        return pieceComponents;
    }, []);

    useEffect(() => {
        const newSocket = io('https://chess-backend-lv8y.onrender.com', {
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
            reconnectionDelayMax: 5000,
            timeout: 20000, // Increased timeout
        });

        newSocket.on('connect', () => {
            console.log('Connected to server, socket ID:', newSocket.id);
            setConnectionStatus('Connected');
            setGameOver(false); // Reset gameOver on reconnect
            if (gameCode) {
                console.log('Joining game with code:', gameCode);
                newSocket.emit('join-game', { code: gameCode });
            } else {
                console.warn('No gameCode provided');
                appendAlert('Error', 'No game code provided', 'error');
            }
        });

        newSocket.on('start-game', () => {
            console.log('Game started!');
            setGameHasStarted(true);
            setGameOver(false);
            updateStatus();
            appendAlert('Game Started', 'Your opponent has joined!', 'success');
        });

        newSocket.on('new-move', (move: ChessMove) => {
            console.log('Received move:', move);
            const result = makeAMove(move);
            if (result) {
                updateStatus();
            } else {
                console.warn('Invalid move received:', move);
                appendAlert('Error', 'Invalid move received from opponent', 'error');
            }
        });

        newSocket.on('game-over-disconnect', () => {
            console.log('Game over: opponent disconnected');
            setGameOver(true);
            appendAlert('Opponent Left', 'Your opponent has disconnected', 'warning');
            updateStatus();
        });

        newSocket.on('connect_error', (err) => {
            console.error('Connection error:', err.message, err);
            setConnectionStatus(`Connection error: ${err.message}`);
            appendAlert('Connection Error', err.message, 'error');
        });

        newSocket.on('reconnect', () => {
            console.log('Reconnected to server');
            setConnectionStatus('Connected');
            setGameOver(false);
            appendAlert('Reconnected', 'Connection restored', 'success');
            if (gameCode) {
                newSocket.emit('join-game', { code: gameCode });
            }
        });

        newSocket.on('reconnect_attempt', (attempt) => {
            console.log(`Reconnection attempt ${attempt}`);
            setConnectionStatus(`Reconnecting (attempt ${attempt})...`);
        });

        newSocket.on('reconnect_failed', () => {
            console.error('Reconnection failed after 5 attempts');
            setConnectionStatus('Failed to reconnect - check server');
            appendAlert('Connection Failed', 'Failed to reconnect to server', 'error');
        });

        setSocket(newSocket);

        // Handle tab/window close
        const handleBeforeUnload = () => {
            console.log('Window closing, disconnecting socket');
            newSocket.disconnect();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            console.log('Disconnecting socket');
            newSocket.disconnect();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [gameCode, appendAlert, makeAMove, updateStatus]);

    useEffect(() => {
        updateStatus();
    }, [game, gameHasStarted, gameOver, updateStatus]);

    useEffect(() => {
        setGame(new Chess());
        setSelectedSquare(null);
        setGameOver(false);
        setGameHasStarted(false);
        setPgn('');
        setFen(game.fen());
        setStatus('Waiting for opponent to join');
    }, [playerColor]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-2xl">
                <div className="mb-4">
                    <div className="mb-2 p-2 border-2 border-zinc-100 rounded-xl flex items-center justify-center">
                        <Link
                            href={'https://chessgame-85747.vercel.app/'}
                            className="flex items-center gap-2 hover:text-blue-500 transition-colors duration-200"
                        >
                            <Home className="h-5 w-5" />
                            Return to home.
                        </Link>
                    </div>

                    {connectionStatus !== 'Connected' && (
                        <div className="mb-2 p-2 bg-yellow-100 rounded-xl">
                            <strong>Status:</strong> {connectionStatus}
                        </div>
                    )}

                    {gameCode && (
                        <div className="mb-2 p-2 border-2 border-zinc-100 rounded-xl text-center">
                            Game Code: <CopyToClipboard text={`${gameCode}`} />
                            Game Link:{' '}
                            <CopyToClipboard
                                text={`${
                                    playerColor === 'white'
                                        ? 'https://chessgame-85747.vercel.app/black?code='
                                        : 'https://chessgame-85747.vercel.app/white?code='
                                }${gameCode}`}
                            />
                        </div>
                    )}

                    <div className="p-2 border-2 border-zinc-100 rounded-xl">
                        <p>
                            <strong>Status:</strong> {status}
                        </p>
                        <p>
                            <strong>Playing as:</strong> {playerColor}
                        </p>
                    </div>
                </div>

                <div className="mb-4">
                    <Chessboard
                        id="myBoard"
                        position={fen}
                        onPieceDrop={onDrop}
                        onSquareClick={onSquareClick}
                        isDraggablePiece={isDraggablePiece}
                        boardOrientation={playerColor}
                        customBoardStyle={{
                            borderRadius: '15px',
                        }}
                        customDarkSquareStyle={{
                            backgroundColor: '#6D98BA',
                        }}
                        customLightSquareStyle={{
                            backgroundColor: '#F5F1ED',
                        }}
                        customPieces={customPieces}
                        customSquareStyles={squareStyles}
                        customDndBackend={TouchBackend}
                        customDndBackendOptions={{ enableMouseEvents: true }}
                    />
                </div>

                <div className="mb-4 p-2 bg-gray-100 rounded-2xl overflow-auto max-h-40">
                    <p>
                        <strong>PGN:</strong>
                    </p>
                    <pre>{pgn || 'No moves yet'}</pre>
                </div>
            </div>
            {alerts.length > 0 && (
                <div className="fixed bottom-4 right-4 space-y-2">
                    {alerts.map((alert, index) => (
                        <div
                            key={index}
                            className={`p-4 rounded-xl ${
                                alert.type === 'success' ? 'bg-green-100' :
                                alert.type === 'warning' ? 'bg-yellow-100' :
                                alert.type === 'error' ? 'bg-red-100' :
                                'bg-blue-100'
                            }`}
                        >
                            <strong>{alert.title}</strong>: {alert.message}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}