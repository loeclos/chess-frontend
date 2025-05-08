import Game from '@/components/game';
import { Suspense } from 'react';

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Game initialColor='black' />
        </Suspense>
    );
}