'use client';

import { Chessboard } from 'react-chessboard';
import { Chess, Square } from 'chess.js';
import { TouchBackend } from 'react-dnd-touch-backend';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Engine from '@/stockfish/engine';
import Link from 'next/link';
import { Home, Brain, RotateCcw } from 'lucide-react';

interface GameProps {
    initialColor?: 'white' | 'black';
    difficulty?: number;
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

const alertStyles = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function Game({
    initialColor = 'white',
    difficulty = 20,
}: GameProps) {
    const [game, setGame] = useState<Chess>(new Chess());
    const playerColor: 'white' | 'black' = initialColor;
    const [gameOver, setGameOver] = useState(false);
    const [status, setStatus] = useState('Your turn');
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [pgn, setPgn] = useState('');
    const [fen, setFen] = useState(game.fen());
    const [isThinking, setIsThinking] = useState(false);
    const [evaluation, setEvaluation] = useState<number | null>(null);
    const [isComputerMove, setIsComputerMove] = useState(
        playerColor === 'black'
    );
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

    const engine = useMemo(() => new Engine(), []);

    useEffect(() => {
        engine.setDifficulty(difficulty);
        return () => {
            engine.terminate();
        };
    }, [engine, difficulty]);

    type EngineMessage = {
        evaluation?: number;
    };

    useEffect(() => {
        const handler = (msg: EngineMessage) => {
            if (msg.evaluation !== undefined) {
                setEvaluation(msg.evaluation);
            }
        };
        engine.onMessage(handler);
        return () => {
            engine.clearHandlers();
        };
    }, [engine]);

    useEffect(() => {
        if (!gameOver) {
            const depth = Math.min(15 + difficulty, 30);
            engine.evaluatePosition(fen, depth);
        }
    }, [fen, difficulty, engine, gameOver]);

    const appendAlert = useCallback(
        (title: string, message: string, type: Alert['type']): void => {
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

    const updateGameState = useCallback(() => {
        const gameCopy = new Chess(game.fen());
        let statusText = '';
        const turn = gameCopy.turn();
        const moveColorString = turn === 'w' ? 'White' : 'Black';
        const isPlayerTurn =
            (playerColor === 'white' && turn === 'w') ||
            (playerColor === 'black' && turn === 'b');

        if (gameCopy.isCheckmate()) {
            statusText = `Checkmate! ${turn === 'w' ? 'Black' : 'White'} wins`;
            appendAlert('Game Over', statusText, 'info');
            setGameOver(true);
        } else if (gameCopy.isDraw()) {
            statusText = 'Game drawn';
            const reason = gameCopy.isStalemate()
                ? 'by stalemate'
                : gameCopy.isThreefoldRepetition()
                ? 'by threefold repetition'
                : gameCopy.isInsufficientMaterial()
                ? 'by insufficient material'
                : 'by the 50-move rule';
            appendAlert('Game Over', `Draw ${reason}`, 'info');
            setGameOver(true);
        } else {
            if (gameCopy.isCheck()) {
                statusText = `${moveColorString} is in check. `;
            }
            statusText += isPlayerTurn
                ? 'Your move'
                : 'Computer is thinking...';
        }

        setStatus(statusText);
        setPgn(gameCopy.pgn());
        setFen(gameCopy.fen());

        return {
            isOver: gameCopy.isGameOver(),
            turn,
        };
    }, [game, playerColor, appendAlert]);

    function timeoutPromise(ms: number) {
        return new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), ms);
        });
    }

    const makeMove = useCallback(
        (move: ChessMove): ReturnType<Chess['move']> => {
            const gameCopy = new Chess(game.fen());
            const result = gameCopy.move(move);
            if (result) {
                setGame(gameCopy);
                setFen(gameCopy.fen());
            }
            return result;
        },
        [game]
    );

    const makeComputerMove = useCallback(async () => {
        if (gameOver) return;
        setIsThinking(true);

        try {
            engine.clearHandlers();
            const thinkTime = Math.min(1000 + difficulty * 200, 10000);
            const bestMove = await Promise.race([
                engine.getBestMove(game.fen(), thinkTime),
                timeoutPromise(thinkTime + 100),
            ]);

            const move =
                bestMove && bestMove.length >= 4
                    ? {
                          from: bestMove.substring(0, 2),
                          to: bestMove.substring(2, 4),
                          promotion:
                              bestMove.length > 4
                                  ? (bestMove.substring(4, 5) as
                                        | 'q'
                                        | 'r'
                                        | 'b'
                                        | 'n')
                                  : undefined,
                      }
                    : null;

            if (move) {
                makeMove(move);
            } else {
                const fallbackGame = new Chess(game.fen());
                const legalMoves = fallbackGame.moves({ verbose: true });
                if (legalMoves.length > 0) {
                    const randomMove =
                        legalMoves[
                            Math.floor(Math.random() * legalMoves.length)
                        ];
                    makeMove({
                        from: randomMove.from,
                        to: randomMove.to,
                        promotion: randomMove.promotion as
                            | 'q'
                            | 'r'
                            | 'b'
                            | 'n'
                            | undefined,
                    });
                }
            }
        } catch (err) {
            console.error('Error during computer move:', err);
        } finally {
            setIsThinking(false);
            setIsComputerMove(false);
            updateGameState();
        }
    }, [
        game,
        gameOver,
        engine,
        makeMove,
        difficulty,
        updateGameState,
    ]);

    // Add this useEffect to unselect the piece when it's not the player's turn
    useEffect(() => {
        if (
            (playerColor === 'white' && game.turn() === 'b') ||
            (playerColor === 'black' && game.turn() === 'w')
        ) {
            setSelectedSquare(null);
        }
    }, [game, playerColor]);

    // Updated onDrop function
    const onDrop = useCallback(
        (source: string, target: string): boolean => {
            if (
                (playerColor === 'white' && game.turn() === 'b') ||
                (playerColor === 'black' && game.turn() === 'w')
            ) {
                return false;
            }

            const move = makeMove({
                from: source,
                to: target,
                promotion: 'q',
            });

            if (move === null) return false;

            setSelectedSquare(null); // Unselect the piece after move
            const { isOver } = updateGameState();
            if (!isOver) {
                setIsComputerMove(true);
            }
            return true;
        },
        [game, makeMove, playerColor, updateGameState, setSelectedSquare]
    );

    const onSquareClick = useCallback(
        (square: Square) => {
            if (gameOver || isThinking) return;
            const piece = game.get(square);

            if (selectedSquare === square) {
                // Clicking the same square again deselects it
                setSelectedSquare(null);
            } else if (selectedSquare === null) {
                // Select a piece if it's the player's turn and their piece
                if (
                    piece &&
                    ((playerColor === 'white' && piece.color === 'w') ||
                        (playerColor === 'black' && piece.color === 'b')) &&
                    ((playerColor === 'white' && game.turn() === 'w') ||
                        (playerColor === 'black' && game.turn() === 'b'))
                ) {
                    setSelectedSquare(square);
                }
            } else {
                // Attempt to move the piece to the clicked square
                const move = makeMove({
                    from: selectedSquare,
                    to: square,
                    promotion: 'q',
                });

                if (move) {
                    setSelectedSquare(null);
                    const { isOver } = updateGameState();
                    if (!isOver) {
                        setIsComputerMove(true);
                    }
                } else {
                    // If no valid move, select the clicked piece if it's the player's
                    if (
                        piece &&
                        ((playerColor === 'white' && piece.color === 'w') ||
                            (playerColor === 'black' && piece.color === 'b'))
                    ) {
                        setSelectedSquare(square);
                    } else {
                        setSelectedSquare(null);
                    }
                }
            }
        },
        [
            selectedSquare,
            game,
            playerColor,
            makeMove,
            updateGameState,
            gameOver,
            isThinking,
        ]
    );

    const legalMoves = useMemo(() => {
        if (selectedSquare) {
            return game
                .moves({ square: selectedSquare as Square, verbose: true })
                .map((move) => move.to);
        }
        return [];
    }, [selectedSquare, game]);

    const squareStyles = useMemo(() => {
        const styles: Record<string, React.CSSProperties> = {};
        if (selectedSquare) {
            // Style for the selected square
            styles[selectedSquare] = {
                backgroundColor: 'rgba(255, 255, 0, 0.4)', // Yellow highlight
            };
            // Style for each legal move square
            legalMoves.forEach((square) => {
                styles[square] = {
                    backgroundImage:
                        'radial-gradient(circle, rgba(184, 184, 184, 0.8) 0%, rgba(184, 184, 184, 0.8) 20%, transparent 20%)',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                };
            });
        }
        return styles;
    }, [selectedSquare, legalMoves]);

    const isDraggablePiece = useCallback(
        ({ piece }: { piece: string; sourceSquare: string }): boolean => {
            if (gameOver || isThinking) return false;
            const playerPiecePrefix = playerColor === 'white' ? 'w' : 'b';
            return (
                piece.startsWith(playerPiecePrefix) &&
                ((playerColor === 'white' && game.turn() === 'w') ||
                    (playerColor === 'black' && game.turn() === 'b'))
            );
        },
        [game, gameOver, isThinking, playerColor]
    );

    const pieces = [
        'wP',
        'wN',
        'wB',
        'wR',
        'wQ',
        'wK',
        'bP',
        'bN',
        'bB',
        'bR',
        'bQ',
        'bK',
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
    }, [pieces]);

    useEffect(() => {
        if (isComputerMove && !gameOver) {
            const timer = setTimeout(() => {
                makeComputerMove();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isComputerMove, makeComputerMove, gameOver]);

    useEffect(() => {
        setGame(new Chess());
        setGameOver(false);
        setEvaluation(null);
        setPgn('');
        setSelectedSquare(null);
        if (playerColor === 'black') {
            setIsComputerMove(true);
        } else {
            setIsComputerMove(false);
        }
    }, [playerColor]);

    useEffect(() => {
        updateGameState();
    }, [game, updateGameState]);

    const resetGame = useCallback(() => {
        setGame(new Chess());
        setGameOver(false);
        setEvaluation(null);
        setPgn('');
        setSelectedSquare(null);
        setIsComputerMove(playerColor === 'black');
    }, [playerColor]);

    const formatEvaluation = useCallback(() => {
        if (evaluation === null) return 'Equal';
        if (Math.abs(evaluation) >= 100) {
            return evaluation > 0 ? 'Mate for you' : 'Mate for computer';
        }
        const absEval = Math.abs(evaluation);
        const sign = evaluation > 0 ? '+' : '-';
        return `${
            evaluation > 0 ? 'Player' : 'Computer'
        } ${sign}${absEval.toFixed(1)}`;
    }, [evaluation]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-2xl">
                <div className="mb-4">
                    <div className="mb-2 p-2 border-2 border-zinc-100 rounded-xl flex items-center justify-between">
                        <Link
                            href={'/'}
                            className="flex items-center gap-2 hover:text-blue-500 transition-colors duration-200"
                        >
                            <Home className="h-5 w-5" />
                            Home
                        </Link>
                        <button
                            onClick={resetGame}
                            className="flex items-center gap-2 hover:text-blue-500 transition-colors duration-200"
                        >
                            <RotateCcw className="h-5 w-5" />
                            Reset Game
                        </button>
                    </div>

                    {alerts.length > 0 && (
                        <div className="mb-4">
                            {alerts.map((alert, index) => (
                                <div
                                    key={index}
                                    className={`p-2 mb-2 rounded-xl ${
                                        alertStyles[alert.type]
                                    }`}
                                >
                                    <strong>{alert.title}:</strong>{' '}
                                    {alert.message}
                                    <button
                                        className="float-right"
                                        onClick={() =>
                                            setAlerts(
                                                alerts.filter(
                                                    (_, i) => i !== index
                                                )
                                            )
                                        }
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="p-2 border-2 border-zinc-100 rounded-xl flex justify-between items-center">
                        <div>
                            <p className="font-medium">{status}</p>
                            <p>
                                Playing as:{' '}
                                <span className="font-bold">{playerColor}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Brain className="h-5 w-5" />
                            <span
                                className={`font-medium ${
                                    evaluation === null
                                        ? 'text-gray-500'
                                        : evaluation > 0
                                        ? 'text-green-600'
                                        : evaluation < 0
                                        ? 'text-red-600'
                                        : 'text-gray-500'
                                }`}
                            >
                                {formatEvaluation()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mb-4 relative">
                    <Chessboard
                        id="myBoard"
                        position={fen}
                        onPieceDrop={onDrop}
                        onSquareClick={onSquareClick}
                        isDraggablePiece={isDraggablePiece}
                        boardOrientation={playerColor}
                        customBoardStyle={{
                            borderRadius: '15px',
                            boxShadow:
                                '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        }}
                        customDarkSquareStyle={{
                            backgroundColor: '#779952',
                        }}
                        customLightSquareStyle={{
                            backgroundColor: '#edeed1',
                        }}
                        customPieces={customPieces}
                        customSquareStyles={squareStyles}
                        customDndBackend={TouchBackend}
                        customDndBackendOptions={{ enableMouseEvents: true }}
                    />
                </div>

                <div className="mb-4 p-2 bg-gray-100 rounded-2xl overflow-auto max-h-40">
                    <p>
                        <strong>Move History:</strong>
                    </p>
                    <pre className="text-sm">{pgn || 'No moves yet'}</pre>
                </div>
            </div>
        </div>
    );
}
